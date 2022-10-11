import {Attachment} from "discord.js"
import {S3} from "../clients"
import {Variables} from "../variables"
import {Upload} from "@aws-sdk/lib-storage"
import {
    _Object,
    HeadObjectCommand,
    HeadObjectCommandInput,
    ListObjectsV2Command,
    ListObjectsV2CommandInput,
    ListObjectsV2CommandOutput,
    NotFound,
    PutObjectCommandInput,
} from "@aws-sdk/client-s3"

export async function uploadAttachment(attachment: Attachment): Promise<string> {
    const key = `${attachment.id}/${attachment.name}`

    const response = await fetch(attachment.url)
    await upload(Variables.s3WarningsBucketName, key, response.body, attachment.contentType ?? undefined)
    return new URL(`${Variables.s3WarningsBucketUrl}/${key}`).toString()
}

export async function* search(bucket: ListObjectsV2CommandInput["Bucket"],
                              prefix?: ListObjectsV2CommandInput["Prefix"]): AsyncGenerator<_Object> {
    let response: ListObjectsV2CommandOutput | undefined = undefined
    do {
        response = await S3.send(new ListObjectsV2Command({
            Bucket: bucket,
            Prefix: prefix,
            ContinuationToken: response ? response.NextContinuationToken : undefined,
        }))

        if (response.Contents) {
            for (const object of response.Contents) {
                yield object
            }
        }
    } while (response.IsTruncated)
}

export async function upload(bucket: PutObjectCommandInput["Bucket"],
                             key: PutObjectCommandInput["Key"],
                             body: PutObjectCommandInput["Body"],
                             contentType?: PutObjectCommandInput["ContentType"]): Promise<void> {
    await new Upload({
        client: S3,
        params: {
            Bucket: bucket,
            Body: body,
            ContentType: contentType,
            Key: key,
        },
        queueSize: 3, // for Cloudflare R2
    }).done()
}

export async function exists(bucket: HeadObjectCommandInput["Bucket"],
                             key: HeadObjectCommandInput["Key"]): Promise<boolean> {
    try {
        await S3.send(new HeadObjectCommand({
            Bucket: bucket,
            Key: key,
        }))
    } catch (e) {
        if (e instanceof NotFound) {
            return false
        }

        throw e
    }

    return true
}