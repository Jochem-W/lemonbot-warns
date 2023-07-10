import { codeBlock, EmbedBuilder } from "discord.js"

export function makeErrorMessage(error: Error) {
  if (error.stack) {
    return {
      embeds: [
        new EmbedBuilder()
          .setTitle("An unexpected error has occurred")
          .setDescription(codeBlock(error.stack))
          .setColor("#ff0000"),
      ],
    }
  }

  return {
    embeds: [
      new EmbedBuilder()
        .setTitle(error.constructor.name)
        .setDescription(error.message)
        .setColor("#ff0000"),
    ],
  }
}
