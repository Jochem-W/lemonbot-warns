import { ComponentType, EmbedBuilder } from "discord.js"

export function originalUserOnlyMessage(type: ComponentType) {
  let name
  switch (type) {
    case ComponentType.ActionRow:
      name = "action row"
      break
    case ComponentType.Button:
      name = "button"
      break
    case ComponentType.TextInput:
      name = "text input"
      break
    case ComponentType.StringSelect:
    case ComponentType.UserSelect:
    case ComponentType.RoleSelect:
    case ComponentType.MentionableSelect:
    case ComponentType.ChannelSelect:
      name = "select menu"
      break
  }

  return {
    embeds: [
      new EmbedBuilder()
        .setTitle(`You can't use this ${name}`)
        .setColor(0xff0000),
    ],
  }
}
