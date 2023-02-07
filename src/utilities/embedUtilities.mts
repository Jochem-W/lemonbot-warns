import { DefaultConfig } from "../models/config.mjs"
import { codeBlock, EmbedBuilder, GuildMember, User } from "discord.js"
import { DateTime } from "luxon"

export function makeEmbed(
  authorName: string,
  authorIcon: URL,
  title?: string,
  description?: string
) {
  return new EmbedBuilder()
    .setAuthor({
      name: authorName,
      iconURL: authorIcon.toString(),
    })
    .setTitle(title ?? null)
    .setDescription(description ?? null)
    .setTimestamp(DateTime.now().toMillis())
}

export function makeErrorEmbed(error: Error) {
  if (error.stack) {
    return makeEmbed(
      "An unexpected error has occurred",
      DefaultConfig.icons.fail
    )
      .setDescription(codeBlock(error.stack))
      .setColor("#ff0000")
  }

  return makeEmbed(error.constructor.name, DefaultConfig.icons.fail)
    .setDescription(codeBlock(error.message))
    .setColor("#ff0000")
}

export function formatName(user: GuildMember | User) {
  if (user instanceof GuildMember) {
    return user.nickname ? `${user.user.tag} [${user.nickname}]` : user.user.tag
  }

  return user.tag
}
