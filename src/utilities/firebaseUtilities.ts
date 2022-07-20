import {pipeline} from "stream/promises"
import {ReadableStream} from "stream/web"
import {Attachment} from "discord.js"
import MIMEType from "whatwg-mimetype"
import {StorageBucket} from "../clients"

export type UploadAttachmentResult = {
    url: string
    type: string
    subtype: string
}

export abstract class FirebaseUtilities {
    public static async uploadAttachment(attachment: Attachment): Promise<UploadAttachmentResult> {
        const mimeType = new MIMEType(attachment.contentType ?? "application/octet-stream")
        const file = StorageBucket.file(`${attachment.id}.${attachment.name?.split(".").pop() ?? "bin"}`)

        const response = await fetch(attachment.url)
        if (!response.body) {
            throw new Error("No response body")
        }

        // FIXME
        await pipeline(response.body as ReadableStream, file.createWriteStream())

        await file.makePublic()

        return {
            url: file.publicUrl(),
            type: mimeType.type,
            subtype: mimeType.subtype,
        }
    }
}