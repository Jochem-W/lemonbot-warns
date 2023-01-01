import {AttachmentBuilder, ChatInputCommandInteraction, PermissionFlagsBits} from "discord.js"
import {ChatInputCommand} from "../models/chatInputCommand"
import {Variables} from "../variables"
import {isFromOwner} from "../utilities/interactionUtilities"
import {OwnerOnlyError} from "../errors"
import {download, search} from "../utilities/s3Utilities"
import type {Readable} from "stream"
import {S3} from "../clients"
import {
    _Object,
    DeleteObjectCommand,
    ListObjectsV2Command,
    ListObjectsV2CommandInput,
    NoSuchKey,
} from "@aws-sdk/client-s3"
import {makeErrorEmbed} from "../utilities/responseBuilder"

export class S3Command extends ChatInputCommand {
    public constructor() {
        super("s3", "Commands related to S3 storage", PermissionFlagsBits.Administrator)
        this.builder
            .addSubcommandGroup(group => group
                .setName("api")
                .setDescription("Commands related to the S3 API")
                .addSubcommand(subcommand => subcommand
                    .setName("list-objects")
                    .setDescription("List objects in a bucket")
                    .addStringOption(option => option
                        .setName("bucket")
                        .setDescription("The name of the bucket to list")
                        .setChoices({
                            name: "Archive",
                            value: Variables.s3ArchiveBucketName,
                        }, {
                            name: "Warnings",
                            value: Variables.s3WarningsBucketName,
                        })
                        .setRequired(true))
                    .addStringOption(option => option
                        .setName("prefix")
                        .setDescription("Limit the response to keys that begin with the specified prefix")))
                .addSubcommand(subcommand => subcommand
                    .setName("get-object")
                    .setDescription("Retrieve objects from S3")
                    .addStringOption(option => option
                        .setName("bucket")
                        .setDescription("The name of the bucket containing the object")
                        .setChoices({
                            name: "Archive",
                            value: Variables.s3ArchiveBucketName,
                        }, {
                            name: "Warnings",
                            value: Variables.s3WarningsBucketName,
                        })
                        .setRequired(true))
                    .addStringOption(option => option
                        .setName("key")
                        .setDescription("The key of the object to retrieve")
                        .setRequired(true)))
                .addSubcommand(subcommand => subcommand
                    .setName("delete-object")
                    .setDescription("Delete an object")
                    .addStringOption(option => option
                        .setName("bucket")
                        .setDescription("The name of the bucket containing the object")
                        .setChoices({
                            name: "Archive",
                            value: Variables.s3ArchiveBucketName,
                        })
                        .setRequired(true))
                    .addStringOption(option => option
                        .setName("key")
                        .setDescription("The key name of the object to delete")
                        .setRequired(true))))
            .addSubcommand(subcommand => subcommand
                .setName("delete")
                .setDescription("Delete objects from a bucket")
                .addStringOption(option => option
                    .setName("bucket")
                    .setDescription("The name of the bucket containing the object")
                    .setChoices({
                        name: "Archive",
                        value: Variables.s3ArchiveBucketName,
                    })
                    .setRequired(true))
                .addIntegerOption(option => option
                    .setName("before")
                    .setDescription("Delete objects before this timestamp")
                    .setRequired(true)))
    }

    public async handle(interaction: ChatInputCommandInteraction) {
        if (!await isFromOwner(interaction)) {
            throw new OwnerOnlyError()
        }

        switch (interaction.options.getSubcommandGroup()) {
            case "api":
                await this.handleApiGroup(interaction)
                break
            case null:
                await this.handleUngrouped(interaction)
                break
        }
    }

    private async handleApiGroup(interaction: ChatInputCommandInteraction) {
        switch (interaction.options.getSubcommand(true)) {
            case "list-objects":
                await this.apiListObjects(interaction)
                break
            case "get-object":
                await this.apiGetObject(interaction)
                break
            case "delete-object":
                await this.apiDeleteObject(interaction)
                break
        }
    }

    private async apiListObjects(interaction: ChatInputCommandInteraction) {
        const input: ListObjectsV2CommandInput = {
            Bucket: interaction.options.getString("bucket", true),
        }

        const prefix = interaction.options.getString("prefix")
        if (prefix) {
            input.Prefix = prefix
        }

        const response = await S3.send(new ListObjectsV2Command(input))

        await interaction.editReply({
            files: [
                new AttachmentBuilder(Buffer.from(JSON.stringify(response, undefined, 4)), {
                    name: "response.json",
                }),
            ],
        })
    }

    private async apiGetObject(interaction: ChatInputCommandInteraction) {
        const key = interaction.options.getString("key", true)
        try {
            const stream = await download(interaction.options.getString("bucket", true), key)
            await interaction.editReply({
                files: [
                    new AttachmentBuilder(stream as Readable, {
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

    private async apiDeleteObject(interaction: ChatInputCommandInteraction) {
        await S3.send(new DeleteObjectCommand({
            Bucket: interaction.options.getString("bucket", true),
            Key: interaction.options.getString("key", true),
        }))

        await interaction.editReply("Deleted object")
    }

    private async handleUngrouped(interaction: ChatInputCommandInteraction) {
        switch (interaction.options.getSubcommand(true)) {
            case "delete":
                await this.ungroupedDelete(interaction)
                break
        }
    }

    private async ungroupedDelete(interaction: ChatInputCommandInteraction) {
        const before = new Date(interaction.options.getInteger("before", true) * 1000)
        const deleted: _Object[] = []
        for await (const object of search(interaction.options.getString("bucket", true))) {
            if (!object.Key) {
                continue
            }

            if (object.LastModified && object.LastModified < before) {
                await S3.send(new DeleteObjectCommand({
                    Bucket: interaction.options.getString("bucket", true),
                    Key: object.Key,
                }))

                deleted.push(object)
            }
        }

        await interaction.editReply({
            files: [
                new AttachmentBuilder(Buffer.from(JSON.stringify(deleted, undefined, 4)), {
                    name: "deleted.json",
                }),
            ],
        })
    }
}