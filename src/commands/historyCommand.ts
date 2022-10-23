import {ChatInputCommand} from "../models/chatInputCommand"
import {ChatInputCommandInteraction, inlineCode, PermissionFlagsBits} from "discord.js"
import Queue from "async-await-queue"
import {InvalidArgumentsError, OwnerOnlyError} from "../errors"
import archiver, {Archiver} from "archiver"
import {download, search} from "../utilities/s3Utilities"
import {Variables} from "../variables"
import {Readable} from "stream"
import {isFromOwner} from "../utilities/interactionUtilities"

export class HistoryCommand extends ChatInputCommand {
    public constructor() {
        super("history", "Commands related to message history", PermissionFlagsBits.Administrator)
        this.builder
            .addSubcommand(subcommand => subcommand
                .setName("user")
                .setDescription("Get the logged messages of a user")
                .addUserOption(option => option
                    .setName("target")
                    .setDescription("The user to get the message history of")
                    .setRequired(true)))
            .addSubcommand(subcommand => subcommand
                .setName("channel")
                .setDescription("Get the logged messages of a channel")
                .addChannelOption(option => option
                    .setName("target")
                    .setDescription("The channel to get the message history of")
                    .setRequired(true)))
            .addSubcommand(subcommand => subcommand
                .setName("prefix")
                .setDescription("Get the logged messages for a prefix")
                .addStringOption(option => option
                    .setName("target")
                    .setDescription("The prefix to get the messages for")
                    .setRequired(true)))
    }

    public async handle(interaction: ChatInputCommandInteraction) {
        if (!await isFromOwner(interaction)) {
            throw new OwnerOnlyError()
        }

        await interaction.editReply(inlineCode("Searching"))

        const queue = new Queue(100)
        const downloads: Promise<void>[] = []
        let editOnProgress: NodeJS.Timeout | undefined
        const report = () => {
            this.reportProgress(downloads.length - queue.stat().waiting, downloads.length, interaction).catch(e => {
                console.error(e)
            })

            editOnProgress = setTimeout(report, 1000)
        }
        report()

        const target = interaction.options.get("target", true)
        let prefix
        let id
        if (target.user) {
            id = target.user.id
            prefix = `users/${id}/`
        } else if (target.channel) {
            id = target.channel.id
            prefix = `channels/${id}/`
        } else if (target.value && typeof target.value === "string") {
            prefix = target.value
            id = target.value.replace("/", "_")
        } else {
            throw new InvalidArgumentsError("Invalid target")
        }

        const archive = archiver("tar", {gzip: true})
        for await (const messageObject of search(Variables.s3ArchiveBucketName, prefix)) {
            if (!messageObject.Key) {
                continue
            }

            downloads.push((async (key) => {
                const me = Symbol()
                await queue.wait(me, 0)
                try {
                    await this.downloadMessage(archive, key)
                } finally {
                    queue.end(me)
                }
            })(messageObject.Key))
        }

        await Promise.allSettled(downloads)
        clearTimeout(editOnProgress)
        await archive.finalize()
        await interaction.editReply({
            content: null,
            files: [{
                attachment: archive,
                name: `${id}.tar.gz`,
            }],
        })
    }

    private async downloadMessage(archive: Archiver, key: string) {
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        for await (const messageObject of search(Variables.s3ArchiveBucketName, `messages/${key.split("/").pop()}/`)) {
            if (!messageObject.Key) {
                continue
            }

            const stream = await download(Variables.s3ArchiveBucketName, messageObject.Key)
            archive.append(stream as Readable, {name: messageObject.Key})
        }
    }

    private async reportProgress(current: number, max: number, interaction: ChatInputCommandInteraction) {
        const barLength = 20
        const progress = max !== 0 ? Math.min(current / max, 1) : 0
        let bar = "=".repeat(Math.floor(progress * barLength))
        bar += " ".repeat(barLength - bar.length)
        await interaction.editReply({
            content: inlineCode(`[${bar}] ${Math.floor(progress * 100)}% (${current}/${max})`),
        })
    }

}