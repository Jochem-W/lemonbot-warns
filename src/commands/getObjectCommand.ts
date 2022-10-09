import {ChatInputCommand} from "../models/chatInputCommand"
import {AttachmentBuilder, ChatInputCommandInteraction, PermissionFlagsBits} from "discord.js"
import {S3} from "../clients"
import {GetObjectCommand} from "@aws-sdk/client-s3"
import {Variables} from "../variables"
import {Readable} from "stream"

export class DiscordGetObjectCommand extends ChatInputCommand {
    public constructor() {
        super("get-object", "Get an object matching the specified key", PermissionFlagsBits.Administrator)
        this.builder.addStringOption(option => option
            .setName("key")
            .setDescription("The key to get the object for")
            .setRequired(true))
    }

    public async handle(interaction: ChatInputCommandInteraction): Promise<void> {
        const key = interaction.options.getString("key", true)
        const response = await S3.send(new GetObjectCommand({
            Bucket: Variables.s3ArchiveBucketName,
            Key: key,
        }))

        await interaction.editReply({
            files: [
                new AttachmentBuilder(response.Body as Readable, {
                    name: key.split("/").pop() ?? "object",
                }),
            ],
        })
    }
}