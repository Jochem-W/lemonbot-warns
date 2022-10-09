import {ChatInputCommand} from "../models/chatInputCommand"
import {AttachmentBuilder, ChatInputCommandInteraction, PermissionFlagsBits} from "discord.js"
import {S3} from "../clients"
import {ListObjectsV2Command} from "@aws-sdk/client-s3"
import {Variables} from "../variables"

export class ListObjectsCommand extends ChatInputCommand {
    public constructor() {
        super("list-objects",
            "List objects matching the specified prefix, or all messages",
            PermissionFlagsBits.Administrator)
        this.builder.addStringOption(option => option
            .setName("prefix")
            .setDescription("The prefix to list objects for")
            .setRequired(false))
    }

    public async handle(interaction: ChatInputCommandInteraction): Promise<void> {
        const response = await S3.send(new ListObjectsV2Command({
            Bucket: Variables.s3BucketName,
            Prefix: interaction.options.getString("prefix") ?? undefined,
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