import {Handler} from "../interfaces/handler"
import {Message, PartialMessage} from "discord.js"
import {Variables} from "../variables"
import {exists, upload} from "../utilities/s3Utilities"

export class MessageUpdateHandler implements Handler<"messageUpdate"> {
    public readonly event = "messageUpdate"
    public readonly once = false

    public async handle(_oldMessage: Message | PartialMessage, newMessage: Message | PartialMessage): Promise<void> {
        newMessage = await newMessage.fetch(true)

        if (!await exists(Variables.s3ArchiveBucketName, `messages/${newMessage.id}/message.json`)) {
            return
        }

        await upload(Variables.s3ArchiveBucketName,
            `messages/${newMessage.id}/edits/${newMessage.editedTimestamp ?? Date.now()}.json`,
            JSON.stringify(newMessage, null, 4),
            "application/json")
    }
}
