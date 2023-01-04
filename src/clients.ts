import { Variables } from "./variables"
import { PrismaClient } from "@prisma/client"
import { S3Client } from "@aws-sdk/client-s3"

export const Prisma = new PrismaClient()
export const S3 = new S3Client({
  region: Variables.s3Region,
  endpoint: Variables.s3Endpoint,
  credentials: {
    accessKeyId: Variables.s3AccessKeyId,
    secretAccessKey: Variables.s3SecretAccessKey,
  },
})
