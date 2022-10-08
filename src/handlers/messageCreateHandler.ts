import {Handler} from "../interfaces/handler"
import {Message} from "discord.js"
import {S3} from "../clients"
import {PutObjectCommand} from "@aws-sdk/client-s3"
import {Variables} from "../variables"

export class MessageCreateHandler implements Handler<"messageCreate"> {
    public readonly event = "messageCreate"
    public readonly once = false

    public async handle(message: Message): Promise<void> {
        await S3.send(new PutObjectCommand({
            Bucket: Variables.s3BucketName,
            Key: `messages/${message.id}/${message.createdTimestamp}.json`,
            Body: JSON.stringify(message.toJSON()),
            ContentType: "application/json",
        }))


        for (const [, attachment] of message.attachments) {
            // @ts-ignore
            const response = await fetch(attachment.url)
            await S3.send(new PutObjectCommand({
                Bucket: Variables.s3BucketName,
                Key: `messages/${message.id}/attachments/${attachment.id}/${attachment.name}`,
                Body: await response.arrayBuffer(),
                ContentType: attachment.contentType ?? undefined,
            }))
        }
    }
}
