import { ChatInputCommand } from "../models/chatInputCommand.mjs"
import { ensureOwner } from "../utilities/discordUtilities.mjs"
import {
  ChatInputCommandInteraction,
  codeBlock,
  EmbedBuilder,
  PermissionFlagsBits,
} from "discord.js"

// eslint-disable-next-line @typescript-eslint/no-empty-function
const AsyncFunction = async function () {}.constructor

export class EvalCommand extends ChatInputCommand {
  public constructor() {
    super("eval", "Run arbitrary code", PermissionFlagsBits.Administrator)
    this.builder.addStringOption((builder) =>
      builder
        .setName("code")
        .setDescription("The code to run")
        .setRequired(true)
    )
  }

  public async handle(interaction: ChatInputCommandInteraction) {
    await ensureOwner(interaction)

    const code = `"use strict"; ${interaction.options.getString("code", true)}`

    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const ret = await (AsyncFunction(code) as () => Promise<unknown>).bind({
      interaction,
    })()
    await interaction.editReply({
      embeds: [
        new EmbedBuilder().setDescription(
          codeBlock("json", JSON.stringify(ret, undefined, 4))
        ),
      ],
    })
  }
}
