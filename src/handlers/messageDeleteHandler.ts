import {Handler} from "../interfaces/handler"
import {Message, PartialMessage} from "discord.js"
import {S3} from "../clients"
import {Variables} from "../variables"
import {MessageCreateHandler} from "./messageCreateHandler"
import {Upload} from "@aws-sdk/lib-storage"

export class MessageDeleteHandler implements Handler<"messageDelete"> {
    public readonly event = "messageDelete"
    public readonly once = false

    public async handle(message: Message | PartialMessage): Promise<void> {
        if (!await MessageCreateHandler.messageIsLogged(message.id)) {
            return
        }

        await new Upload({
            client: S3,
            params: {
                Bucket: Variables.s3ArchiveBucketName,
                Key: `messages/${message.id}/deleted.json`,
                Body: JSON.stringify(true, null, 4),
                ContentType: "application/json",
            },
            queueSize: 3, // for Cloudflare R2
        }).done()
    }
}
