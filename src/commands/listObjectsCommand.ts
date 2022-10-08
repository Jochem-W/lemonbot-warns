import {ChatInputCommand} from "../models/chatInputCommand"
import {AttachmentBuilder, ChatInputCommandInteraction, PermissionFlagsBits} from "discord.js"
import {S3} from "../clients"
import {ListObjectsV2Command} from "@aws-sdk/client-s3"
import {Variables} from "../variables"

export class ListObjectsCommand extends ChatInputCommand {
    public constructor() {
        super("list-objects",
            "List objects matching the specified message ID, or all messages",
            PermissionFlagsBits.Administrator)
        this.builder.addStringOption(option => option
            .setName("id")
            .setDescription("The message ID to list objects for")
            .setRequired(false))
    }

    public async handle(interaction: ChatInputCommandInteraction): Promise<void> {
        const id = interaction.options.getString("id")
        const response = await S3.send(new ListObjectsV2Command({
            Bucket: Variables.s3BucketName,
            Prefix: id ? `messages/${id}/` : `messages/`,
        }))

        await interaction.editReply({
            files: [
                new AttachmentBuilder(Buffer.from(JSON.stringify(response, null, 4)), {
                    name: "response.json",
                }),
            ],
        })
    }
}