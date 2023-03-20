import { S3 } from "../clients.mjs"
import { Variables } from "../variables.mjs"
import {
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  NotFound,
} from "@aws-sdk/client-s3"
import type {
  GetObjectCommandInput,
  HeadObjectCommandInput,
  ListObjectsV2CommandInput,
  ListObjectsV2CommandOutput,
  PutObjectCommandInput,
} from "@aws-sdk/client-s3"
import { Upload } from "@aws-sdk/lib-storage"
import type { Options } from "@aws-sdk/lib-storage"
import type { Attachment } from "discord.js"

export async function uploadAttachment(attachment: Attachment) {
  const key = `${attachment.id}/${attachment.name}`

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
) {
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
) {
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
) {
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
