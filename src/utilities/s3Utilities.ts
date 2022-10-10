import {Attachment} from "discord.js"
import {S3} from "../clients"
import {Variables} from "../variables"
import {Upload} from "@aws-sdk/lib-storage"

export async function uploadAttachment(attachment: Attachment): Promise<string> {
    const key = `${attachment.id}/${attachment.name}`

    // @ts-ignore
    const response = await fetch(attachment.url)
    await new Upload({
        client: S3,
        params: {
            Bucket: Variables.s3WarningsBucketName,
            Key: key,
            Body: response.body as NodeJS.ReadableStream,
        },
        queueSize: 3, // for Cloudflare R2
    }).done()

    return new URL(`${Variables.s3WarningsBucketUrl}/${key}`).toString()
}