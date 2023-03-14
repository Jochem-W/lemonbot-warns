import { Forms, Prisma, S3, Sheets } from "../clients.mjs"
import { ChatInputCommand } from "../models/chatInputCommand.mjs"
import { DefaultConfig } from "../models/config.mjs"
import { ensureOwner } from "../utilities/discordUtilities.mjs"
import { makeEmbed } from "../utilities/embedUtilities.mjs"
import {
  AttachmentBuilder,
  ChatInputCommandInteraction,
  CommandInteraction,
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

  public static async eval(interaction: CommandInteraction, code: string) {
    code = `"use strict";${code}`
    const returnValue = await (
      AsyncFunction(code) as () => Promise<unknown>
    ).bind({
      interaction,
      Prisma,
      S3,
      Forms,
      Sheets,
    })()

    if (!returnValue) {
      return
    }

    let returnString
    let json = false
    if (typeof returnValue === "string") {
      returnString = returnValue
    } else {
      returnString = JSON.stringify(returnValue, undefined, 4)
      json = true
    }

    const embeds: EmbedBuilder[] = []
    const files: AttachmentBuilder[] = []

    if (returnString.length <= 2036) {
      const embed = makeEmbed("eval", DefaultConfig.icons.success)
      embed.setDescription(
        `\`\`\`${json ? "json" : ""}\n${returnString}\n\`\`\``
      )
      embeds.push(embed)
    } else {
      files.push(
        new AttachmentBuilder(Buffer.from(returnString), {
          name: json ? "eval.json" : "eval.txt",
        })
      )
    }

    await interaction.editReply({ embeds, files })
  }

  public async handle(interaction: ChatInputCommandInteraction) {
    await ensureOwner(interaction)
    await EvalCommand.eval(
      interaction,
      interaction.options.getString("code", true)
    )
  }
}
