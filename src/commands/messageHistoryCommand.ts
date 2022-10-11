import {ChatInputCommand} from "../models/chatInputCommand"
import {ChatInputCommandInteraction, PermissionFlagsBits} from "discord.js"
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

        const user = interaction.options.getUser("user", true)
        const keys: string[] = []

        for await (const userMessageObject of search(Variables.s3ArchiveBucketName, `users/${user.id}/`)) {
            if (!userMessageObject.Key) {
                continue
            }

            const messageId = userMessageObject.Key.split("/").pop()
            for await (const messageObject of search(Variables.s3ArchiveBucketName, `messages/${messageId}/`)) {
                if (!messageObject.Key) {
                    continue
                }

                keys.push(messageObject.Key)
            }
        }

        const archive = archiver("tar", {gzip: true})
        for (const key of keys) {
            const stream = await download(Variables.s3ArchiveBucketName, key)
            archive.append(stream as Readable, {name: key})
        }

        await archive.finalize()

        await interaction.editReply({
            files: [{
                attachment: archive,
                name: `${user.id}.tar.gz`,
            }],
        })
    }
}