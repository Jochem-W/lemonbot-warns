import { Prisma, S3 } from "../clients.mjs"
import {
  slashCommand,
  slashOption,
  subcommand,
} from "../models/slashCommand.mjs"
import { ensureOwner } from "../utilities/discordUtilities.mjs"
import { Variables } from "../variables.mjs"
import { DeleteObjectCommand } from "@aws-sdk/client-s3"
import {
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandIntegerOption,
  SlashCommandStringOption,
} from "discord.js"

export const EditCommand = slashCommand({
  name: "edit",
  description: "Edit an existing warning",
  defaultMemberPermissions: PermissionFlagsBits.Administrator,
  subcommands: [
    subcommand({
      name: "delete",
      description: "Delete a warning",
      options: [
        slashOption(true, {
          option: new SlashCommandIntegerOption()
            .setName("id")
            .setDescription("The warning ID"),
        }),
      ],
      async handle(interaction, _subcommand, warningId) {
        await ensureOwner(interaction)

        const images = await Prisma.image.findMany({ where: { warningId } })
        await Prisma.image.deleteMany({ where: { warningId } })
        const warning = await Prisma.warning.delete({
          where: { id: warningId },
        })
        for (const image of images) {
          await S3.send(
            new DeleteObjectCommand({
              Bucket: Variables.s3WarningsBucketName,
              Key: new URL(image.url).pathname.slice(1),
            })
          )
        }

        const user = await Prisma.user.findFirstOrThrow({
          where: { id: warning.userId },
          include: { warnings: true },
        })

        if (user.warnings.length === 0) {
          await Prisma.user.delete({ where: { id: user.id } })
        }

        await interaction.reply({
          embeds: [new EmbedBuilder().setTitle("Warning deleted")],
          ephemeral: true,
        })
      },
    }),
    subcommand({
      name: "description",
      description: "Edit the description of a warning",
      options: [
        slashOption(true, {
          option: new SlashCommandIntegerOption()
            .setName("id")
            .setDescription("The warning ID"),
        }),
        slashOption(true, {
          option: new SlashCommandStringOption()
            .setName("description")
            .setDescription("The new warning description"),
        }),
      ],
      async handle(interaction, _subcommand, id, description) {
        await ensureOwner(interaction)

        await Prisma.warning.update({
          where: {
            id,
          },
          data: {
            description,
          },
        })

        await interaction.reply({
          embeds: [new EmbedBuilder().setTitle("Warning edited")],
          ephemeral: true,
        })
      },
    }),
  ],
})
