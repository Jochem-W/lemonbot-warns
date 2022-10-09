import {Attachment} from "discord.js"
import {S3} from "../clients"
import {PutObjectCommand} from "@aws-sdk/client-s3"
import {Variables} from "../variables"

export async function uploadAttachment(attachment: Attachment): Promise<string> {
    const key = `${attachment.id}/${attachment.name}`

    // @ts-ignore
    const response = await fetch(attachment.url)
    await S3.send(new PutObjectCommand({
        Key: key,
        Bucket: Variables.s3WarningsBucketName,
        Body: await response.arrayBuffer(),
        ContentType: attachment.contentType ?? undefined,
    }))

    return new URL(`${Variables.s3WarningsBucketUrl}/${key}`).toString()
}