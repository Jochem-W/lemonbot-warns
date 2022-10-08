import {Handler} from "../interfaces/handler"
import {Message, PartialMessage} from "discord.js"
import {S3} from "../clients"
import {PutObjectCommand} from "@aws-sdk/client-s3"
import {Variables} from "../variables"
import {MessageCreateHandler} from "./messageCreateHandler"

export class MessageDeleteHandler implements Handler<"messageDelete"> {
    public readonly event = "messageDelete"
    public readonly once = false

    public async handle(message: Message | PartialMessage): Promise<void> {
        if (!await MessageCreateHandler.messageIsLogged(message.id)) {
            return
        }

        await S3.send(new PutObjectCommand({
            Bucket: Variables.s3BucketName,
            Key: `messages/${message.id}/deleted.json`,
            Body: JSON.stringify(true),
            ContentType: "application/json",
        }))
    }
}
