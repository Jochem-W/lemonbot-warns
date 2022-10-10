import {Handler} from "../interfaces/handler"
import {Message, Snowflake} from "discord.js"
import {S3} from "../clients"
import {HeadObjectCommand, NotFound} from "@aws-sdk/client-s3"
import {Variables} from "../variables"
import {Upload} from "@aws-sdk/lib-storage"

export class MessageCreateHandler implements Handler<"messageCreate"> {
    public readonly event = "messageCreate"
    public readonly once = false

    public static async messageIsLogged(id: Snowflake): Promise<boolean> {
        try {
            await S3.send(new HeadObjectCommand({
                Bucket: Variables.s3ArchiveBucketName,
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

        await new Upload({
            client: S3,
            params: {
                Bucket: Variables.s3ArchiveBucketName,
                Body: JSON.stringify(message.toJSON(), null, 4),
                ContentType: "application/json",
                Key: `messages/${message.id}/message.json`,
            },
            queueSize: 3, // for Cloudflare R2
        }).done()

        for (const [, attachment] of message.attachments) {
            // @ts-ignore
            const response = await fetch(attachment.url)
            await new Upload({
                client: S3,
                params: {
                    Bucket: Variables.s3ArchiveBucketName,
                    Key: `messages/${message.id}/attachments/${attachment.id}/${attachment.name}`,
                    Body: response.body as NodeJS.ReadableStream,
                    ContentType: attachment.contentType ?? undefined,
                },
                queueSize: 3, // for Cloudflare R2
            }).done()
        }
    }
}
