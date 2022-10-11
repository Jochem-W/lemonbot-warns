import {Handler} from "../interfaces/handler"
import {Collection, GuildTextBasedChannel, Message, PartialMessage, Snowflake} from "discord.js"
import {Variables} from "../variables"
import {exists, upload} from "../utilities/s3Utilities"

export class MessageDeleteBulkHandler implements Handler<"messageDeleteBulk"> {
    public readonly event = "messageDeleteBulk"
    public readonly once = false

    public async handle(messages: Collection<Snowflake, Message | PartialMessage>,
                        _channel: GuildTextBasedChannel): Promise<void> {
        for (const [id] of messages) {
            if (!await exists(Variables.s3ArchiveBucketName, `messages/${id}/message.json`)) {
                continue
            }

            await upload(Variables.s3ArchiveBucketName, `messages/${id}/deleted`, "", "text/plain")
        }
    }
}
