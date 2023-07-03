import { Forms, Prisma, S3, Sheets } from "../clients.mjs"
import { slashCommand, slashOption } from "../models/slashCommand.mjs"
import { ensureOwner } from "../utilities/discordUtilities.mjs"
import {
  AttachmentBuilder,
  CommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandStringOption,
} from "discord.js"

// eslint-disable-next-line @typescript-eslint/no-empty-function
const AsyncFunction = async function () {}.constructor

export async function evalCode(interaction: CommandInteraction, code: string) {
  const returnValue = await (
    AsyncFunction(`"use strict";${code}`) as () => Promise<unknown>
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
    const embed = new EmbedBuilder().setTitle("eval")
    embed.setDescription(`\`\`\`${json ? "json" : ""}\n${returnString}\n\`\`\``)
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

export const EvalCommand = slashCommand({
  name: "eval",
  description: "Run arbitrary code",
  defaultMemberPermissions: PermissionFlagsBits.Administrator,
  options: [
    slashOption(
      true,
      new SlashCommandStringOption()
        .setName("code")
        .setDescription("The code to run")
    ),
  ],
  async handle(interaction, code) {
    await ensureOwner(interaction)
    await interaction.deferReply({ ephemeral: true })
    await evalCode(interaction, code)
  },
})
