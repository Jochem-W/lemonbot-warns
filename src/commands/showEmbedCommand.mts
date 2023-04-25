import { Prisma } from "../clients.mjs"
import { warnLogMessage } from "../messages/warnLogMessage.mjs"
import { warnMessage } from "../messages/warnMessage.mjs"
import { ChatInputCommand } from "../models/chatInputCommand.mjs"
import { ChatInputCommandInteraction, PermissionFlagsBits } from "discord.js"

export class ShowEmbedCommand extends ChatInputCommand {
  public constructor() {
    super(
      "show-embed",
      "Show various warning embeds",
      PermissionFlagsBits.ModerateMembers
    )
    this.builder
      .addIntegerOption((builder) =>
        builder.setName("id").setDescription("The warning ID").setRequired(true)
      )
      .addStringOption((builder) =>
        builder
          .setName("type")
          .setDescription("The type of embed to show")
          .setChoices(
            { name: "Warning log", value: "warn-log" },
            { name: "Warning DM", value: "warn-dm" }
          )
          .setRequired(true)
      )
  }

  public async handle(interaction: ChatInputCommandInteraction) {
    const type = interaction.options.getString("type", true)
    const id = interaction.options.getInteger("id", true)
    const warning = await Prisma.warning.findFirstOrThrow({
      where: { id },
      include: { penalty: true, reasons: true, images: true, guild: true },
    })

    switch (type) {
      case "warn-dm":
        await interaction.reply({
          ...(await warnMessage(warning)),
          ephemeral: true,
        })
        break
      case "warn-log":
        await interaction.reply({
          ...(await warnLogMessage(warning)),
          ephemeral: true,
        })
        break
      default:
        throw new Error("Invalid type")
    }
  }
}
