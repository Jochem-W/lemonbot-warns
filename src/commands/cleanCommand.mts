import { Prisma, S3 } from "../clients.mjs"
import { ChatInputCommand } from "../models/chatInputCommand.mjs"
import { DefaultConfig } from "../models/config.mjs"
import { ensureOwner } from "../utilities/discordUtilities.mjs"
import { search } from "../utilities/s3Utilities.mjs"
import { Variables } from "../variables.mjs"
import { DeleteObjectCommand } from "@aws-sdk/client-s3"
import {
  ChatInputCommandInteraction,
  codeBlock,
  EmbedBuilder,
  PermissionFlagsBits,
  userMention,
} from "discord.js"

export class CleanCommand extends ChatInputCommand {
  public constructor() {
    super(
      "clean",
      "Clean up the S3 storage and database",
      PermissionFlagsBits.Administrator
    )
  }

  public async handle(interaction: ChatInputCommandInteraction) {
    await ensureOwner(interaction)

    const users = await Prisma.user.findMany({
      where: {
        warnings: { none: {} },
      },
      include: { warnings: true },
    })

    for (const user of users) {
      // redundant?
      if (user.warnings.length !== 0) {
        continue
      }

      await Prisma.user.delete({ where: { id: user.id } })
    }

    const keys: string[] = []
    for await (const object of search(Variables.s3WarningsBucketName)) {
      if (!object.Key) {
        continue
      }

      const image = await Prisma.image.findFirst({
        where: {
          url: {
            endsWith: object.Key,
          },
        },
      })

      if (image) {
        continue
      }

      keys.push(object.Key)
      await S3.send(
        new DeleteObjectCommand({
          Bucket: Variables.s3WarningsBucketName,
          Key: object.Key,
        })
      )
    }

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setAuthor({
            name: "Cleanup completed",
            iconURL: DefaultConfig.icons.success.toString(),
          })
          .setFields(
            {
              name: "Users deleted from database",
              value:
                users.map((u) => `- ${userMention(u.id)}`).join("\n") || "None",
            },
            {
              name: "Images deleted from S3",
              value: codeBlock("diff", keys.map((k) => `- ${k}`).join("\n")),
            }
          ),
      ],
    })
  }
}
