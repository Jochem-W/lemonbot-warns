import { codeBlock, EmbedBuilder, GuildMember, User } from "discord.js"

export function makeErrorEmbed(error: Error) {
  if (error.stack) {
    return new EmbedBuilder()
      .setTitle("An unexpected error has occurred")
      .setDescription(codeBlock(error.stack))
      .setColor("#ff0000")
  }

  return new EmbedBuilder()
    .setTitle(error.constructor.name)
    .setDescription(error.message)
    .setColor("#ff0000")
}

export function formatName(user: GuildMember | User) {
  if (user instanceof GuildMember) {
    return user.nickname ? `${user.user.tag} (${user.nickname})` : user.user.tag
  }

  return user.tag
}
