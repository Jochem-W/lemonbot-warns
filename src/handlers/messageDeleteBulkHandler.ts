import {Handler} from "../interfaces/handler"
import {Collection, GuildTextBasedChannel, Message, PartialMessage, Snowflake} from "discord.js"
import {S3} from "../clients"
import {Variables} from "../variables"
import {MessageCreateHandler} from "./messageCreateHandler"
import {Upload} from "@aws-sdk/lib-storage"

export class MessageDeleteBulkHandler implements Handler<"messageDeleteBulk"> {
    public readonly event = "messageDeleteBulk"
    public readonly once = false

    public async handle(messages: Collection<Snowflake, Message | PartialMessage>,
                        _channel: GuildTextBasedChannel): Promise<void> {
        for (const [id] of messages) {
            if (!await MessageCreateHandler.messageIsLogged(id)) {
                continue
            }

            await new Upload({
                client: S3,
                params: {
                    Bucket: Variables.s3ArchiveBucketName,
                    Key: `messages/${id}/deleted.json`,
                    Body: JSON.stringify(true, null, 4),
                    ContentType: "application/json",
                },
                queueSize: 3, // for Cloudflare R2
            }).done()
        }
    }
}
