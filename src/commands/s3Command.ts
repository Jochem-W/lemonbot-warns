import {AttachmentBuilder, ChatInputCommandInteraction, inlineCode, PermissionFlagsBits} from "discord.js"
import {ChatInputCommand} from "../models/chatInputCommand"
import {Variables} from "../variables"
import {isFromOwner} from "../utilities/interactionUtilities"
import {OwnerOnlyError} from "../errors"
import Queue from "async-await-queue"
import archiver, {Archiver} from "archiver"
import {download, search} from "../utilities/s3Utilities"
import {Readable} from "stream"
import {S3} from "../clients"
import {_Object, DeleteObjectCommand, ListObjectsV2Command, NoSuchKey} from "@aws-sdk/client-s3"
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
                .setName("history")
                .setDescription("Get the logged messages of a user")
                .addUserOption(option => option
                    .setName("user")
                    .setDescription("The user to get the message history of")
                    .setRequired(true)))
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
        const response = await S3.send(new ListObjectsV2Command({
            Bucket: interaction.options.getString("bucket", true),
            Prefix: interaction.options.getString("prefix") ?? undefined,
        }))

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
            case "history":
                await this.ungroupedHistory(interaction)
                break
            case "delete":
                await this.ungroupedDelete(interaction)
                break
        }
    }

    private async ungroupedHistory(interaction: ChatInputCommandInteraction) {
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
        const archive = archiver("tar", {gzip: true})
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