import {Handler} from "../interfaces/handler"
import {Message} from "discord.js"
import {Variables} from "../variables"
import {upload} from "../utilities/s3Utilities"

export class MessageCreateHandler implements Handler<"messageCreate"> {
    public readonly event = "messageCreate"
    public readonly once = false

    public async handle(message: Message): Promise<void> {
        if (message.author.bot) {
            return
        }

        await upload(Variables.s3ArchiveBucketName,
            `messages/${message.id}/message.json`,
            JSON.stringify(message.toJSON(), null, 4),
            "application/json")

        for (const [, attachment] of message.attachments) {
            const response = await fetch(attachment.url)
            await upload(Variables.s3ArchiveBucketName,
                `messages/${message.id}/attachments/${attachment.id}/${attachment.name}`,
                response.body,
                attachment.contentType ?? undefined)
        }
    }
}
