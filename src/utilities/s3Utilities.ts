import type { Attachment } from "discord.js"
import { S3 } from "../clients"
import { Variables } from "../variables"
import { Options, Upload } from "@aws-sdk/lib-storage"
import {
  _Object,
  GetObjectCommand,
  GetObjectCommandInput,
  HeadObjectCommand,
  HeadObjectCommandInput,
  ListObjectsV2Command,
  ListObjectsV2CommandInput,
  ListObjectsV2CommandOutput,
  NotFound,
  PutObjectCommandInput,
} from "@aws-sdk/client-s3"

export async function uploadAttachment(
  attachment: Attachment
): Promise<string> {
  const key = `${attachment.id}/${attachment.name ?? attachment.id}`

  const response = await fetch(attachment.url)
  await upload(
    Variables.s3WarningsBucketName,
    key,
    response.body ?? undefined,
    attachment.contentType ?? undefined
  )
  return new URL(`${Variables.s3WarningsBucketUrl}/${key}`).toString()
}

export async function download(
  bucket: Required<GetObjectCommandInput["Bucket"]>,
  key: Required<GetObjectCommandInput["Key"]>
) {
  const response = await S3.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  )

  return response.Body
}

export async function* search(
  bucket: Required<ListObjectsV2CommandInput["Bucket"]>,
  prefix?: ListObjectsV2CommandInput["Prefix"]
): AsyncGenerator<_Object> {
  const input: ListObjectsV2CommandInput = {
    Bucket: bucket,
  }

  if (prefix) {
    input.Prefix = prefix
  }

  let response: ListObjectsV2CommandOutput | undefined = undefined
  do {
    if (response?.NextContinuationToken) {
      input.ContinuationToken = response.NextContinuationToken
    }

    response = await S3.send(new ListObjectsV2Command(input))

    if (response.Contents) {
      for (const object of response.Contents) {
        yield object
      }
    }
  } while (response.IsTruncated)
}

export async function upload(
  bucket: Required<PutObjectCommandInput["Bucket"]>,
  key: Required<PutObjectCommandInput["Key"]>,
  body: PutObjectCommandInput["Body"],
  contentType?: PutObjectCommandInput["ContentType"]
): Promise<void> {
  const options: Options = {
    client: S3,
    params: {
      Bucket: bucket,
      Key: key,
    },
    queueSize: 3, // for Cloudflare R2
  }

  if (body) {
    options.params.Body = body
  }

  if (contentType) {
    options.params.ContentType = contentType
  }

  await new Upload(options).done()
}

export async function exists(
  bucket: Required<HeadObjectCommandInput["Bucket"]>,
  key: Required<HeadObjectCommandInput["Key"]>
): Promise<boolean> {
  try {
    await S3.send(
      new HeadObjectCommand({
        Bucket: bucket,
        Key: key,
      })
    )
  } catch (e) {
    if (e instanceof NotFound) {
      return false
    }

    throw e
  }

  return true
}
