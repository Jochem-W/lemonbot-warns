import {Handler} from "../interfaces/handler"
import {Message, Snowflake} from "discord.js"
import {S3} from "../clients"
import {HeadObjectCommand, NotFound, PutObjectCommand} from "@aws-sdk/client-s3"
import {Variables} from "../variables"

export class MessageCreateHandler implements Handler<"messageCreate"> {
    public readonly event = "messageCreate"
    public readonly once = false

    public static async messageIsLogged(id: Snowflake): Promise<boolean> {
        try {
            await S3.send(new HeadObjectCommand({
                Bucket: Variables.s3BucketName,
                Key: `messages/${id}/message.json`,
            }))
        } catch (e) {
            if (e instanceof NotFound) {
                return false
            }
        }

        return true
    }

    public async handle(message: Message): Promise<void> {
        if (message.author.bot) {
            return
        }

        await S3.send(new PutObjectCommand({
            Bucket: Variables.s3BucketName,
            Key: `messages/${message.id}/message.json`,
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
