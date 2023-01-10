import { Variables } from "./variables.mjs"
import { S3Client } from "@aws-sdk/client-s3"
import { PrismaClient } from "@prisma/client"
import { GoogleAuth } from "google-auth-library"

export const Prisma = new PrismaClient()
export const S3 = new S3Client({
  region: Variables.s3Region,
  endpoint: Variables.s3Endpoint,
  credentials: {
    accessKeyId: Variables.s3AccessKeyId,
    secretAccessKey: Variables.s3SecretAccessKey,
  },
})
export const Google = await new GoogleAuth({
  scopes: [
    "https://www.googleapis.com/auth/forms.responses.readonly",
    "https://www.googleapis.com/auth/forms.body.readonly",
  ],
}).getClient()
