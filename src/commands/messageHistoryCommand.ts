import {ChatInputCommand} from "../models/chatInputCommand"
import {ChatInputCommandInteraction, inlineCode, PermissionFlagsBits} from "discord.js"
import {Variables} from "../variables"
import {isFromOwner} from "../utilities/interactionUtilities"
import {OwnerOnlyError} from "../errors"
import {download, search} from "../utilities/s3Utilities"
import archiver, {Archiver} from "archiver"
import {Readable} from "stream"
import Queue from "async-await-queue"

export class MessageHistoryCommand extends ChatInputCommand {
    public constructor() {
        super("message-history",
            "Get the logged messages of a user",
            PermissionFlagsBits.Administrator)
        this.builder.addUserOption(option => option
            .setName("user")
            .setDescription("The user to get the message history of")
            .setRequired(true))
    }

    public async handle(interaction: ChatInputCommandInteraction): Promise<void> {
        if (!await isFromOwner(interaction)) {
            throw new OwnerOnlyError()
        }

        await interaction.editReply(inlineCode("Searching"))

        const queue = new Queue(3, 100)
        const downloads: Promise<void>[] = []
        let editOnProgress: NodeJS.Timeout | undefined
        const report = () => {
            this.reportProgress(downloads.length - queue.stat().waiting, downloads.length, interaction).catch(e => {
                console.error(e)
            })

            editOnProgress = setTimeout(report, 1000)
        }
        report()

        const user = interaction.options.getUser("user", true)
        const archive = archiver("zip", {zlib: {level: 9}})
        for await (const userMessageObject of search(Variables.s3ArchiveBucketName, `users/${user.id}/`)) {
            if (!userMessageObject.Key) {
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
            })(userMessageObject.Key))
        }

        await Promise.allSettled(downloads)
        clearTimeout(editOnProgress)
        await archive.finalize()
        await interaction.editReply({
            content: null,
            files: [{
                attachment: archive,
                name: `${user.id}.tar.gz`,
            }],
        })
    }

    private async downloadMessage(archive: Archiver, key: string) {
        for await (const messageObject of search(Variables.s3ArchiveBucketName, `messages/${key.split("/").pop()}/`)) {
            if (!messageObject.Key) {
                continue
            }

            const stream = await download(Variables.s3ArchiveBucketName, key)
            archive.append(stream as Readable, {name: key})
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