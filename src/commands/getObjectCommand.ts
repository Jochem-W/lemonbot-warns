import {ChatInputCommand} from "../models/chatInputCommand"
import {AttachmentBuilder, ChatInputCommandInteraction, PermissionFlagsBits} from "discord.js"
import {S3} from "../clients"
import {GetObjectCommand, NoSuchKey} from "@aws-sdk/client-s3"
import {Variables} from "../variables"
import {Readable} from "stream"
import {makeErrorEmbed} from "../utilities/responseBuilder"
import {isFromOwner} from "../utilities/interactionUtilities"
import {OwnerOnlyError} from "../errors"

export class DiscordGetObjectCommand extends ChatInputCommand {
    public constructor() {
        super("get-object", "Get an object matching the specified key", PermissionFlagsBits.Administrator)
        this.builder.addStringOption(option => option
            .setName("key")
            .setDescription("The key to get the object for")
            .setRequired(true))
    }

    public async handle(interaction: ChatInputCommandInteraction): Promise<void> {
        if (!await isFromOwner(interaction)) {
            throw new OwnerOnlyError()
        }

        const key = interaction.options.getString("key", true)
        try {
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
        } catch (e) {
            if (e instanceof NoSuchKey) {
                await interaction.editReply({embeds: [makeErrorEmbed(e)]})
                return
            }

            throw e
        }
    }
}