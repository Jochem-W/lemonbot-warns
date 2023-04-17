import { NoValidCodeError } from "../errors.mjs"
import { MessageContextMenuCommand } from "../models/messageContextMenuCommand.mjs"
import { ensureOwner } from "../utilities/discordUtilities.mjs"
import { EvalCommand } from "./evalCommand.mjs"
import {
  MessageContextMenuCommandInteraction,
  PermissionFlagsBits,
} from "discord.js"

export class EvalMessageCommand extends MessageContextMenuCommand {
  public constructor() {
    super("Eval", PermissionFlagsBits.Administrator)
  }

  public async handle(interaction: MessageContextMenuCommandInteraction) {
    await ensureOwner(interaction)
    await interaction.deferReply({ ephemeral: true })

    const match =
      interaction.targetMessage.content.match(/^```js\n(.*)\n```$/s)?.[1]
    if (!match) {
      throw new NoValidCodeError(
        "The specified message doesn't contain valid code"
      )
    }

    await EvalCommand.eval(interaction, match)
  }
}
