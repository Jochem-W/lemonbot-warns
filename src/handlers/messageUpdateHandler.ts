import {Handler} from "../interfaces/handler"
import {Message, PartialMessage} from "discord.js"
import {S3} from "../clients"
import {PutObjectCommand} from "@aws-sdk/client-s3"
import {Variables} from "../variables"
import {MessageCreateHandler} from "./messageCreateHandler"

export class MessageUpdateHandler implements Handler<"messageUpdate"> {
    public readonly event = "messageUpdate"
    public readonly once = false

    public async handle(_oldMessage: Message | PartialMessage, newMessage: Message | PartialMessage): Promise<void> {
        newMessage = await newMessage.fetch(true)

        if (!await MessageCreateHandler.messageIsLogged(newMessage.id)) {
            return
        }

        await S3.send(new PutObjectCommand({
            Bucket: Variables.s3BucketName,
            Key: `messages/${newMessage.id}/edits/${newMessage.editedTimestamp ?? Date.now()}.json`,
            Body: JSON.stringify(newMessage.toJSON()),
            ContentType: "application/json",
        }))
    }
}
