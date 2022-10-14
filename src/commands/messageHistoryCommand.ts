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

        await interaction.editReply(inlineCode("Searching"))

        const user = interaction.options.getUser("user", true)
        const userMessageKeys: string[] = []
        for await (const userMessageObject of search(Variables.s3ArchiveBucketName, `users/${user.id}/`)) {
            if (!userMessageObject.Key) {
                continue
            }

            userMessageKeys.push(userMessageObject.Key)
        }

        const archive = archiver("tar", {gzip: true})
        let current = 0
        let lastEdited = 0
        for (const key of userMessageKeys) {
            if (Date.now() - lastEdited > 1000) {
                lastEdited = await this.reportProgress(current, userMessageKeys.length, interaction)
            }

            for await (const messageObject of
                search(Variables.s3ArchiveBucketName, `messages/${key.split("/").pop()}/`)) {
                if (messageObject.Key) {
                    const stream = await download(Variables.s3ArchiveBucketName, messageObject.Key)
                    archive.append(stream as Readable, {name: messageObject.Key})
                }
            }

            current++
        }

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