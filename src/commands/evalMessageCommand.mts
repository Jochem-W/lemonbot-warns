import { NoValidCodeError } from "../errors.mjs"
import { contextMenuCommand } from "../models/contextMenuCommand.mjs"
import { ensureOwner } from "../utilities/discordUtilities.mjs"
import { evalCode } from "./evalCommand.mjs"
import { ApplicationCommandType, PermissionFlagsBits } from "discord.js"

export const EvalMessageCommand = contextMenuCommand({
  type: ApplicationCommandType.Message,
  name: "Eval",
  defaultMemberPermissions: PermissionFlagsBits.Administrator,
  async handle(interaction, message) {
    await ensureOwner(interaction)
    await interaction.deferReply({ ephemeral: true })

    const match = message.content.match(/^```js\n(.*)\n```$/s)?.[1]
    if (!match) {
      throw new NoValidCodeError(
        "The specified message doesn't contain valid code"
      )
    }

    await evalCode(interaction, match)
  },
})
