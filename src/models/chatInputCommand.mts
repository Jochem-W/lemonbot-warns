import type { Command } from "../interfaces/command.mjs"
import {
  ChatInputCommandInteraction,
  RESTPostAPIApplicationCommandsJSONBody,
  SlashCommandBuilder,
} from "discord.js"

export abstract class ChatInputCommand
  implements Command<ChatInputCommandInteraction>
{
  public builder = new SlashCommandBuilder()

  protected constructor(
    name: string,
    description: string,
    defaultMemberPermissions: bigint
  ) {
    this.builder
      .setName(name)
      .setDescription(description)
      .setDefaultMemberPermissions(defaultMemberPermissions)
      .setDMPermission(false)
  }

  public abstract handle(
    interaction: ChatInputCommandInteraction
  ): Promise<void>

  public toJSON(): RESTPostAPIApplicationCommandsJSONBody {
    return this.builder.toJSON()
  }
}
