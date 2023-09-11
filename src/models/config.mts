import { readFile } from "fs/promises"
import { z } from "zod"

const model = z.object({
  banAppealForm: z.object({
    id: z.string(),
    questions: z.object({
      banDate: z.string(),
      banReason: z.string(),
      contactMethod: z.string(),
      discordId: z.string(),
      emailAddress: z.string(),
      twitterUsername: z.string(),
      unbanReason: z.string(),
    }),
  }),
  bot: z.object({
    applicationId: z.string(),
  }),
  mailUserId: z.string(),
  repository: z
    .object({
      name: z.string(),
      owner: z.string(),
    })
    .optional(),
  s3: z.object({
    region: z.string(),
    endpoint: z.string(),
    bucket: z.object({ name: z.string(), url: z.string().url() }),
  }),
})

export const Config = await model.parseAsync(
  JSON.parse(await readFile("config.json", "utf-8")),
)
