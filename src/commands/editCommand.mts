import { Prisma, S3 } from "../clients.mjs"
import {
  ImageOnlyError,
  NoContentTypeError,
  OwnerOnlyError,
  SubcommandGroupNotFoundError,
  SubcommandNotFoundError,
} from "../errors.mjs"
import { ChatInputCommand } from "../models/chatInputCommand.mjs"
import { isFromOwner } from "../utilities/discordUtilities.mjs"
import { makeEmbed } from "../utilities/responseBuilder.mjs"
import { uploadAttachment } from "../utilities/s3Utilities.mjs"
import { Variables } from "../variables.mjs"
import { DeleteObjectCommand } from "@aws-sdk/client-s3"
import { ChatInputCommandInteraction, PermissionFlagsBits } from "discord.js"
import MIMEType from "whatwg-mimetype"

export class EditCommand extends ChatInputCommand {
  public constructor() {
    super("edit", "Edit an existing warning", PermissionFlagsBits.Administrator)
    this.builder
      .addSubcommand((subcommandGroup) =>
        subcommandGroup
          .setName("delete")
          .setDescription("Delete a warning")
          .addIntegerOption((builder) =>
            builder
              .setName("id")
              .setDescription("The warning ID")
              .setRequired(true)
          )
      )
      .addSubcommandGroup((subcommandGroup) =>
        subcommandGroup
          .setName("image")
          .setDescription("Edit the images of a warning")
          .addSubcommand((subcommandGroup) =>
            subcommandGroup
              .setName("append")
              .setDescription("Append an image to a warning")
              .addIntegerOption((builder) =>
                builder
                  .setName("id")
                  .setDescription("The warning ID")
                  .setRequired(true)
              )
              .addAttachmentOption((builder) =>
                builder
                  .setName("image")
                  .setDescription("The image to append to the warning")
                  .setRequired(true)
              )
          )
      )
      .addSubcommandGroup((subcommandGroup) =>
        subcommandGroup
          .setName("description")
          .setDescription("Edit the description of a warning")
          .addSubcommand((subcommandGroup) =>
            subcommandGroup
              .setName("set")
              .setDescription("Set the description of a warning")
              .addIntegerOption((builder) =>
                builder
                  .setName("id")
                  .setDescription("The warning ID")
                  .setRequired(true)
              )
              .addStringOption((builder) =>
                builder
                  .setName("description")
                  .setDescription("The new warning description")
                  .setRequired(true)
              )
          )
      )
  }

  private static async handleImage(interaction: ChatInputCommandInteraction) {
    const warningId = interaction.options.getInteger("id", true)
    const attachment = interaction.options.getAttachment("image", true)
    if (!attachment.contentType) {
      throw new NoContentTypeError(attachment)
    }

    const mimeType = new MIMEType(attachment.contentType)
    if (mimeType.type !== "image") {
      throw new ImageOnlyError(attachment)
    }

    const url = await uploadAttachment(attachment)

    const subcommand = interaction.options.getSubcommand(true)
    switch (subcommand) {
      case "append":
        await Prisma.warning.update({
          where: {
            id: warningId,
          },
          data: {
            images: {
              push: [url],
            },
          },
        })
        break
      default:
        throw new SubcommandNotFoundError(interaction, subcommand)
    }
  }

  private static async handleDescription(
    interaction: ChatInputCommandInteraction
  ) {
    const warningId = interaction.options.getInteger("id", true)
    const description = interaction.options.getString("description", true)

    const subcommand = interaction.options.getSubcommand(true)
    switch (subcommand) {
      case "set":
        await Prisma.warning.update({
          where: {
            id: warningId,
          },
          data: {
            description: description,
          },
        })
        break
      default:
        throw new SubcommandNotFoundError(interaction, subcommand)
    }
  }

  private static async handleDelete(interaction: ChatInputCommandInteraction) {
    const warningId = interaction.options.getInteger("id", true)
    const warning = await Prisma.warning.delete({ where: { id: warningId } })
    for (const image of warning.images) {
      await S3.send(
        new DeleteObjectCommand({
          Bucket: Variables.s3WarningsBucketName,
          Key: new URL(image).pathname.slice(1),
        })
      )
    }
  }

  public async handle(interaction: ChatInputCommandInteraction) {
    if (!(await isFromOwner(interaction))) {
      throw new OwnerOnlyError()
    }

    const subcommandGroup = interaction.options.getSubcommandGroup()
    switch (subcommandGroup) {
      case "image":
        await EditCommand.handleImage(interaction)
        break
      case "description":
        await EditCommand.handleDescription(interaction)
        break
      case null:
        const subcommand = interaction.options.getSubcommand(true)
        switch (subcommand) {
          case "delete":
            await EditCommand.handleDelete(interaction)
            break
          default:
            throw new SubcommandNotFoundError(interaction, subcommand)
        }
        break
      default:
        throw new SubcommandGroupNotFoundError(interaction, subcommandGroup)
    }

    await interaction.editReply({ embeds: [makeEmbed("Warning edited")] })
  }
}
