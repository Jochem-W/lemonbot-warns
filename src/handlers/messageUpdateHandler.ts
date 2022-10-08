import {Handler} from "../interfaces/handler"
import {Message, PartialMessage} from "discord.js"
import {S3} from "../clients"
import {HeadObjectCommand, PutObjectCommand} from "@aws-sdk/client-s3"
import {Variables} from "../variables"

export class MessageUpdateHandler implements Handler<"messageUpdate"> {
    public readonly event = "messageUpdate"
    public readonly once = false

    public async handle(_oldMessage: Message | PartialMessage, newMessage: Message | PartialMessage): Promise<void> {
        newMessage = await newMessage.fetch(true)

        const response = await S3.send(new HeadObjectCommand({
            Bucket: Variables.s3BucketName,
            Key: `messages/${newMessage.id}`,
        }))

        if (response.$metadata.httpStatusCode !== 200) {
            return
        }

        await S3.send(new PutObjectCommand({
            Bucket: Variables.s3BucketName,
            Key: `messages/${newMessage.id}/${newMessage.editedTimestamp ?? Date.now()}.json`,
            Body: JSON.stringify(newMessage.toJSON()),
            ContentType: "application/json",
        }))
    }
}
