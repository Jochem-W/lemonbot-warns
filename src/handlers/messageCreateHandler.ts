import {Handler} from "../interfaces/handler"
import {Message} from "discord.js"
import {Variables} from "../variables"
import {upload} from "../utilities/s3Utilities"
import Queue from "async-await-queue"
import {DefaultConfig} from "../models/config"

export class MessageCreateHandler implements Handler<"messageCreate"> {
    public readonly event = "messageCreate"
    public readonly once = false

    public async handle(message: Message): Promise<void> {
        if (message.author.bot && !DefaultConfig.guild.loggedBots.includes(message.author.id)) {
            return
        }

        const queue = new Queue(100)
        const uploads: Promise<void>[] = [
            (async () => {
                const me = Symbol()
                await queue.wait(me, 0)
                try {
                    await upload(Variables.s3ArchiveBucketName,
                        `messages/${message.id}/message.json`,
                        JSON.stringify(message.toJSON(), null, 4),
                        "application/json")
                } finally {
                    queue.end(me)
                }
            })(),
            (async () => {
                const me = Symbol()
                await queue.wait(me, 0)
                try {
                    await upload(Variables.s3ArchiveBucketName,
                        `users/${message.author.id}/messages/${message.id}`,
                        "",
                        "text/plain")
                } finally {
                    queue.end(me)
                }
            })(),
            (async () => {
                const me = Symbol()
                await queue.wait(me, 0)
                try {
                    await upload(Variables.s3ArchiveBucketName,
                        `channels/${message.channel.id}/messages/${message.id}`,
                        "",
                        "text/plain")
                } finally {
                    queue.end(me)
                }
            })(),
        ]

        for (const [, attachment] of message.attachments) {
            uploads.push((async () => {
                const me = Symbol()
                await queue.wait(me, 0)
                try {
                    const response = await fetch(attachment.url)
                    await upload(Variables.s3ArchiveBucketName,
                        `messages/${message.id}/attachments/${attachment.id}/${attachment.name ?? attachment.id}`,
                        response.body ?? undefined,
                        attachment.contentType ?? undefined)
                } finally {
                    queue.end(me)
                }
            })())
        }

        await Promise.allSettled(uploads)
    }
}
