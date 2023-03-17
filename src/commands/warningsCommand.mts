import { Discord, Prisma } from "../clients.mjs"
import { BotError } from "../errors.mjs"
import { ChatInputCommand } from "../models/chatInputCommand.mjs"
import { chunks } from "../utilities/arrayUtilities.mjs"
import { fetchMember } from "../utilities/discordUtilities.mjs"
import { formatName, makeEmbed } from "../utilities/embedUtilities.mjs"
import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  GuildMember,
  inlineCode,
  PermissionFlagsBits,
  time,
  User,
} from "discord.js"
import type { InteractionReplyOptions } from "discord.js"

export class WarningsCommand extends ChatInputCommand {
  public constructor() {
    super(
      "warnings",
      "List a user's warnings",
      PermissionFlagsBits.ModerateMembers
    )
    this.builder.addUserOption((option) =>
      option.setName("user").setDescription("Target user").setRequired(true)
    )
  }

  public static async buildResponse(subject: User | GuildMember) {
    const embeds = [
      makeEmbed(
        `Warnings for ${formatName(subject)}`,
        new URL(subject.displayAvatarURL())
      ).setTimestamp(null),
    ]

    const entry = await Prisma.user.findFirst({
      where: {
        id: subject.id,
      },
      include: {
        warnings: {
          include: {
            reasons: true,
            penalty: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    })

    if (!entry) {
      embeds[0]?.setTitle("This user isn't in the database")
      return [{ embeds }]
    }

    const lastWarning = entry.warnings.at(-1)
    const reasons: string[] = []
    for (const reason of entry.warnings.flatMap((warning) => warning.reasons)) {
      if (reasons.includes(reason.name)) {
        continue
      }

      reasons.push(reason.name)
    }

    embeds[0]?.setFields(
      {
        name: "Current penalty level",
        value: lastWarning?.penalty.name ?? "N/A",
      },
      {
        name: "Reasons",
        value: reasons.length ? reasons.join("\n") : "N/A",
      },
      {
        name: "Priority",
        value: inlineCode(`${entry.priority ? "✅" : "❌"}`),
      },
      {
        name: "User ID",
        value: subject.id,
      }
    )

    for (const warning of entry.warnings) {
      const warningEmbeds: EmbedBuilder[] = warning.images.map((image) =>
        new EmbedBuilder().setImage(image)
      )
      if (!warningEmbeds.length) {
        warningEmbeds.push(new EmbedBuilder())
      }

      let title: string
      if (warning.penalty.ban) {
        title = "Banned"
      } else if (warning.penalty.kick) {
        title = "Kicked"
      } else if (warning.penalty.timeout) {
        title = "Timed out"
      } else {
        title = "Warned"
      }

      if (warning.silent) {
        title += " (silent)"
      }

      const warnedBy = await Discord.users.fetch(warning.createdBy)
      let name = `${title} by ${formatName(warnedBy)} `

      const reasonsString = warning.reasons
        .map((reason) => reason.name)
        .join(", ")
      if (reasonsString) {
        name += `for ${reasonsString} `
      }
      name += `${time(warning.createdAt, "R")} [${warning.id}]`

      warningEmbeds[0]?.setFields({
        name: name,
        value: warning.description ?? "N/A",
      })

      embeds.push(...warningEmbeds)
    }

    return [...chunks(embeds, 10)].map((embeds) => ({ embeds }))
  }

  public async handle(interaction: ChatInputCommandInteraction) {
    const user = interaction.options.getUser("user", true)

    const messages = await WarningsCommand.buildResponse(
      (await fetchMember(interaction, user)) ?? user
    )

    if (!messages[0]) {
      throw new BotError("Response has 0 messages")
    }

    await interaction.editReply(messages[0])
    for (const message of messages.slice(1)) {
      const options: InteractionReplyOptions = {
        ...message,
      }

      if (interaction.ephemeral) {
        options.ephemeral = true
      }

      await interaction.followUp(options)
    }
  }
}
