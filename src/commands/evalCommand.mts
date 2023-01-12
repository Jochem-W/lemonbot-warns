import { SubcommandNotFoundError } from "../errors.mjs"
import { ChatInputCommand } from "../models/chatInputCommand.mjs"
import { ensureOwner, fetchChannel } from "../utilities/discordUtilities.mjs"
import {
  ChannelType,
  ChatInputCommandInteraction,
  codeBlock,
  EmbedBuilder,
  escapeCodeBlock,
  PermissionFlagsBits,
} from "discord.js"

// eslint-disable-next-line @typescript-eslint/no-empty-function
const AsyncFunction = async function () {}.constructor

export class EvalCommand extends ChatInputCommand {
  public constructor() {
    super("eval", "Run arbitrary code", PermissionFlagsBits.Administrator)
    this.builder
      .addSubcommand((subcommandGroup) =>
        subcommandGroup
          .setName("string")
          .setDescription("Run code from a string")
          .addStringOption((builder) =>
            builder
              .setName("code")
              .setDescription("The code to run")
              .setRequired(true)
          )
      )
      .addSubcommand((subcommandGroup) =>
        subcommandGroup
          .setName("message")
          .setDescription("Run code from a message")
          .addStringOption((builder) =>
            builder
              .setName("id")
              .setDescription("The ID of the message containing code")
              .setRequired(true)
          )
          .addChannelOption((builder) =>
            builder
              .setName("channel")
              .setDescription("The ID of the message containing code")
          )
      )
  }

  public async handle(interaction: ChatInputCommandInteraction) {
    await ensureOwner(interaction)

    let code = '"use strict";'

    const subcommand = interaction.options.getSubcommand(true)
    switch (subcommand) {
      case "string":
        code += interaction.options.getString("code", true)
        break
      case "message":
        {
          let channel = interaction.options.getChannel("channel")
          if (channel !== null) {
            channel = await fetchChannel(
              interaction.client,
              channel.id,
              ChannelType.GuildText
            )
          } else {
            channel = await fetchChannel(
              interaction.client,
              interaction.channelId,
              ChannelType.GuildText
            )
          }

          const message = await channel.messages.fetch(
            interaction.options.getString("id", true)
          )
          code += escapeCodeBlock(message.content)
        }
        break
      default:
        throw new SubcommandNotFoundError(interaction, subcommand)
    }

    const ret = await (AsyncFunction(code) as () => Promise<unknown>).bind({
      interaction,
    })()

    if (ret) {
      await interaction.editReply({
        embeds: [
          new EmbedBuilder().setDescription(
            codeBlock("json", JSON.stringify(ret, undefined, 4))
          ),
        ],
      })
    }
  }
}
