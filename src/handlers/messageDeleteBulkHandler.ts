import {Handler} from "../interfaces/handler"
import {Collection, GuildTextBasedChannel, Message, PartialMessage, Snowflake} from "discord.js"
import {S3} from "../clients"
import {PutObjectCommand} from "@aws-sdk/client-s3"
import {Variables} from "../variables"
import {MessageCreateHandler} from "./messageCreateHandler"

export class MessageDeleteBulkHandler implements Handler<"messageDeleteBulk"> {
    public readonly event = "messageDeleteBulk"
    public readonly once = false

    public async handle(messages: Collection<Snowflake, Message | PartialMessage>,
                        _channel: GuildTextBasedChannel): Promise<void> {
        for (const [id] of messages) {
            if (!await MessageCreateHandler.messageIsLogged(id)) {
                continue
            }

            await S3.send(new PutObjectCommand({
                Bucket: Variables.s3BucketName,
                Key: `messages/${id}/deleted.json`,
                Body: JSON.stringify(true, null, 4),
                ContentType: "application/json",
            }))
        }
    }
}
