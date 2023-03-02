import { Variables } from "./variables.mjs"
import { S3Client } from "@aws-sdk/client-s3"
import { auth, forms } from "@googleapis/forms"
import { PrismaClient } from "@prisma/client"

export const Prisma = new PrismaClient()
export const S3 = new S3Client({
  region: Variables.s3Region,
  endpoint: Variables.s3Endpoint,
  credentials: {
    accessKeyId: Variables.s3AccessKeyId,
    secretAccessKey: Variables.s3SecretAccessKey,
  },
})
export const Forms = forms({
  version: "v1",
  auth: new auth.GoogleAuth({
    scopes: [
      "https://www.googleapis.com/auth/forms.responses.readonly",
      "https://www.googleapis.com/auth/forms.body.readonly",
    ],
  }),
})
