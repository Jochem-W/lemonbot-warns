import {Handler} from "../interfaces/handler"
import {Message, PartialMessage} from "discord.js"
import {S3} from "../clients"
import {Variables} from "../variables"
import {MessageCreateHandler} from "./messageCreateHandler"
import {Upload} from "@aws-sdk/lib-storage"

export class MessageUpdateHandler implements Handler<"messageUpdate"> {
    public readonly event = "messageUpdate"
    public readonly once = false

    public async handle(_oldMessage: Message | PartialMessage, newMessage: Message | PartialMessage): Promise<void> {
        newMessage = await newMessage.fetch(true)

        if (!await MessageCreateHandler.messageIsLogged(newMessage.id)) {
            return
        }

        await new Upload({
            client: S3,
            params: {
                Bucket: Variables.s3ArchiveBucketName,
                Key: `messages/${newMessage.id}/edits/${newMessage.editedTimestamp ?? Date.now()}.json`,
                Body: JSON.stringify(newMessage.toJSON(), null, 4),
                ContentType: "application/json",
            },
            queueSize: 3, // for Cloudflare R2
        }).done()
    }
}
