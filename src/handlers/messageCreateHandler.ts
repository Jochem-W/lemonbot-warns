import type {Handler} from "../interfaces/handler"
import type {Message} from "discord.js"
import {Prisma} from "../clients"
import {DefaultConfig} from "../models/config"
import {upload} from "../utilities/s3Utilities"
import {Variables} from "../variables"

export class MessageCreateHandler implements Handler<"messageCreate"> {
    public readonly event = "messageCreate"
    public readonly once = false

    public async handle(message: Message) {
        if (message.author.bot) {
            return
        }

        if (!message.inGuild() || message.guildId !== DefaultConfig.guild.id) {
            return
        }

        await Prisma.message.create({
            data: {
                id: message.id,
                userId: message.author.id,
                channelId: message.channelId,
                deleted: false,
                revisions: {
                    create: [
                        {
                            timestamp: message.createdAt,
                            content: message.content,
                        },
                    ],
                },
            },
        })

        for (const [, attachment] of message.attachments) {
            const key = new URL(attachment.url).pathname.slice(1)
            const response = await fetch(attachment.url)
            await upload(Variables.s3ArchiveBucketName,
                key,
                response.body ?? undefined,
                attachment.contentType ?? undefined)
            const url = `${Variables.s3ArchiveBucketUrl}/${key}`
            await Prisma.messageAttachment.create({
                data: {
                    message: {
                        connect: {
                            id: message.id,
                        },
                    },
                    id: attachment.id,
                    url: url,
                    mimeType: attachment.contentType,
                },
            })
        }
    }
}