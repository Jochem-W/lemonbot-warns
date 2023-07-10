import { WarningsCache } from "../commands/searchCommand.mjs"
import { component } from "../models/component.mjs"
import { userDisplayName } from "../utilities/discordUtilities.mjs"
import type { Penalty, Warning } from "@prisma/client"
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Client,
  ComponentType,
  EmbedBuilder,
  type MessageActionRowComponentBuilder,
} from "discord.js"

const searchUpdate = component({
  type: ComponentType.Button,
  name: "search",
  async handle(interaction, key, page) {
    const warnings = WarningsCache.get(key)
    if (warnings === undefined) {
      // disable
      return
    }

    await interaction.update(
      await searchMessage(interaction.client, key, warnings, parseInt(page))
    )
  },
})

function calculateStart(messages: { embeds: EmbedBuilder[] }[], page: number) {
  let start = 0

  for (let i = 0; i < page; i++) {
    let length = 0
    let take = 0
    for (const message of messages) {
      const newLength = length + message.embeds.length
      if (newLength > 2 && length !== 0) {
        break
      }

      length += message.embeds.length
      take += 1
    }

    start += take
    messages = messages.slice(take)
  }

  return start
}

export async function searchMessage(
  client: Client<true>,
  key: string,
  warnings: {
    embeds: EmbedBuilder[]
    warning: Warning & { penalty: Penalty }
  }[],
  page: number
) {
  const total = warnings.length
  const start = calculateStart(warnings, page)
  warnings = warnings.slice(start)

  let end = start
  const embeds: EmbedBuilder[] = []
  for (const warning of warnings) {
    const newLength = embeds.length + warning.embeds.length
    if (newLength > 2 && embeds.length !== 0) {
      break
    }

    let verb
    if (warning.warning.penalty.ban) {
      verb = "Banned"
    } else if (warning.warning.penalty.kick) {
      verb = "Kicked"
    } else if (warning.warning.penalty.timeout) {
      verb = "Timed out"
    } else {
      verb = "Warned"
    }

    const userOrMember = await client.users.fetch(warning.warning.userId)
    const warnedBy = await client.users.fetch(warning.warning.createdBy)
    warning.embeds[0]?.setAuthor({
      name: `${verb} ${userDisplayName(userOrMember)}`,
      iconURL: userOrMember.displayAvatarURL(),
    })

    warning.embeds.at(-1)?.setFooter({
      text: `${verb} by ${userDisplayName(warnedBy)}`,
      iconURL: warnedBy.displayAvatarURL(),
    })

    embeds.push(...warning.embeds)
    end++
  }

  return {
    embeds,
    components: [
      new ActionRowBuilder<MessageActionRowComponentBuilder>().setComponents([
        new ButtonBuilder()
          .setStyle(ButtonStyle.Primary)
          .setCustomId(searchUpdate(key, (page - 1).toString(10)))
          .setDisabled(start === 0)
          .setEmoji("⬅️"),
        new ButtonBuilder()
          .setStyle(ButtonStyle.Primary)
          .setCustomId(searchUpdate(key, (page + 1).toString(10)))
          .setDisabled(end >= total)
          .setEmoji("➡️"),
      ]),
    ],
  }
}
