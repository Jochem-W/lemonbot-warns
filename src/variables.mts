import camelcaseKeys from "camelcase-keys"
import { z } from "zod"

const model = z
  .object({
    DISCORD_BOT_TOKEN: z.string(),
    COMMIT_HASH: z.string().optional(),
    GITHUB_TOKEN: z.string(),
    S3_ACCESS_KEY_ID: z.string(),
    S3_ENDPOINT: z.string(),
    S3_REGION: z.string(),
    S3_SECRET_ACCESS_KEY: z.string(),
    S3_ARCHIVE_BUCKET_NAME: z.string(),
    S3_ARCHIVE_BUCKET_URL: z.string(),
    S3_WARNINGS_BUCKET_NAME: z.string(),
    S3_WARNINGS_BUCKET_URL: z.string(),
    NODE_ENV: z.string(),
  })
  .transform((arg) => camelcaseKeys(arg))

export const Variables = await model.parseAsync(process.env)
