import {ChatInputCommand} from "../models/chatInputCommand"
import {ChatInputCommandInteraction, inlineCode, PermissionFlagsBits} from "discord.js"
import {Variables} from "../variables"
import {isFromOwner} from "../utilities/interactionUtilities"
import {OwnerOnlyError} from "../errors"
import {download, search} from "../utilities/s3Utilities"
import archiver from "archiver"
import {Readable} from "stream"

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

        const userMessageKeys: string[] = []
        const user = interaction.options.getUser("user", true)

        let max = 0
        let completed = false
        const searchUserMessages = (async () => {
            for await (const userMessageObject of search(Variables.s3ArchiveBucketName, `users/${user.id}/`)) {
                if (!userMessageObject.Key) {
                    continue
                }

                userMessageKeys.push(userMessageObject.Key)
                max++
            }

            completed = true
        })()

        const archive = archiver("tar", {gzip: true})
        let current = 0
        let lastEdited = 0
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        while (!completed || userMessageKeys.length > 0) {
            if (Date.now() - lastEdited > 2500) {
                lastEdited = await this.reportProgress(current, max, interaction)
            }

            if (userMessageKeys.length > 0) {
                current++
            }

            for await (const messageObject of
                search(Variables.s3ArchiveBucketName, `messages/${userMessageKeys.shift()?.split("/").pop()}/`)) {
                if (messageObject.Key) {
                    // TODO: download in parallel?
                    const stream = await download(Variables.s3ArchiveBucketName, messageObject.Key)
                    archive.append(stream as Readable, {name: messageObject.Key})
                }
            }
        }

        await searchUserMessages

        await archive.finalize()
        await interaction.editReply({
            content: null,
            files: [{
                attachment: archive,
                name: `${user.id}.tar.gz`,
            }],
        })
    }

    private async reportProgress(current: number, max: number, interaction: ChatInputCommandInteraction) {
        const barLength = 20
        const progress = max !== 0 ? Math.min(current / max, 1) : 0
        let bar = "=".repeat(Math.floor(progress * barLength))
        bar += " ".repeat(barLength - bar.length)
        const message = await interaction.editReply({
            content: inlineCode(`[${bar}] ${Math.floor(progress * 100)}% (${current}/${max})`),
        })

        return message.editedTimestamp ?? Date.now()
    }
}