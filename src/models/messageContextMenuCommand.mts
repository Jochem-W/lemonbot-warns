import type { Command } from "../types/command.mjs"
import {
  ApplicationCommandType,
  ContextMenuCommandBuilder,
  MessageContextMenuCommandInteraction,
} from "discord.js"

export abstract class MessageContextMenuCommand
  implements Command<MessageContextMenuCommandInteraction>
{
  public readonly builder = new ContextMenuCommandBuilder()

  protected constructor(name: string, defaultMemberPermissions: bigint | null) {
    this.builder
      .setType(ApplicationCommandType.Message)
      .setName(name)
      .setDefaultMemberPermissions(defaultMemberPermissions)
      .setDMPermission(false)
  }

  public abstract handle(
    interaction: MessageContextMenuCommandInteraction
  ): Promise<void>

  public toJSON() {
    return this.builder.toJSON()
  }
}
