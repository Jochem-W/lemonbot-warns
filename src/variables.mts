import camelcaseKeys from "camelcase-keys"
import { z } from "zod"

const model = z
  .object({
    DISCORD_BOT_TOKEN: z.string(),
    COMMIT_HASH: z.string().optional(),
    GITHUB_TOKEN: z.string().optional(),
    S3_ACCESS_KEY_ID: z.string(),
    S3_SECRET_ACCESS_KEY: z.string(),
    NODE_ENV: z.string().optional(),
  })
  .transform((arg) => camelcaseKeys(arg))

export const Variables = await model.parseAsync(process.env)
