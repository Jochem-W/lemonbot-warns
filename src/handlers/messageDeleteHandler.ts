import {Handler} from "../interfaces/handler"
import {Message, PartialMessage} from "discord.js"
import {Variables} from "../variables"
import {exists, upload} from "../utilities/s3Utilities"

export class MessageDeleteHandler implements Handler<"messageDelete"> {
    public readonly event = "messageDelete"
    public readonly once = false

    public async handle(message: Message | PartialMessage): Promise<void> {
        if (!await exists(Variables.s3ArchiveBucketName, `messages/${message.id}/message.json`)) {
            return
        }

        await upload(Variables.s3ArchiveBucketName, `messages/${message.id}/deleted.json`, "", "text/plain")
    }
}
