import { ChatInputCommand } from "../models/chatInputCommand.mjs"
import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  Snowflake,
} from "discord.js"
import { isFromOwner } from "../utilities/discordUtilities.mjs"
import {
  InvalidArgumentsError,
  OwnerOnlyError,
  reportError,
} from "../errors.mjs"
import { Prisma } from "../clients.mjs"
import type { Readable } from "stream"
import archiver from "archiver"
import { download } from "../utilities/s3Utilities.mjs"
import { Variables } from "../variables.mjs"
import { createWriteStream } from "fs"
import { unlink } from "fs/promises"

export class HistoryCommand extends ChatInputCommand {
  public constructor() {
    super(
      "history",
      "Retrieve message history",
      PermissionFlagsBits.Administrator
    )
    this.builder
      .addSubcommand((subcommandGroup) =>
        subcommandGroup
          .setName("deleted")
          .setDescription("Retrieve all deleted messages")
          .addBooleanOption((builder) =>
            builder
              .setName("attachments")
              .setDescription("Whether to retrieve attachments")
          )
      )
      .addSubcommand((subcommandGroup) =>
        subcommandGroup
          .setName("channel")
          .setDescription("Retrieve message history for a channel")
          .addChannelOption((builder) =>
            builder
              .setName("channel")
              .setRequired(true)
              .setDescription("The channel to retrieve messages for")
          )
          .addBooleanOption((builder) =>
            builder
              .setName("attachments")
              .setDescription("Whether to retrieve attachments")
          )
          .addBooleanOption((builder) =>
            builder
              .setName("deleted_only")
              .setDescription("Whether to only retrieve deleted messages")
          )
      )
      .addSubcommand((subcommandGroup) =>
        subcommandGroup
          .setName("channel_id")
          .setDescription("Retrieve message history for a channel")
          .addStringOption((builder) =>
            builder
              .setName("id")
              .setRequired(true)
              .setDescription("The channel to retrieve messages for")
          )
          .addBooleanOption((builder) =>
            builder
              .setName("attachments")
              .setDescription("Whether to retrieve attachments")
          )
          .addBooleanOption((builder) =>
            builder
              .setName("deleted_only")
              .setDescription("Whether to only retrieve deleted messages")
          )
      )
      .addSubcommand((subcommandGroup) =>
        subcommandGroup
          .setName("user")
          .setDescription("Retrieve message history for a user")
          .addUserOption((builder) =>
            builder
              .setName("user")
              .setRequired(true)
              .setDescription("The user to retrieve messages for")
          )
          .addBooleanOption((builder) =>
            builder
              .setName("attachments")
              .setDescription("Whether to retrieve attachments")
          )
          .addBooleanOption((builder) =>
            builder
              .setName("deleted_only")
              .setDescription("Whether to only retrieve deleted messages")
          )
      )
      .addSubcommand((subcommandGroup) =>
        subcommandGroup
          .setName("message")
          .setDescription("Retrieve a specific message")
          .addStringOption((builder) =>
            builder
              .setName("id")
              .setRequired(true)
              .setDescription("The ID of the message to retrieve")
          )
          .addBooleanOption((builder) =>
            builder
              .setName("attachments")
              .setDescription("Whether to retrieve attachments")
          )
          .addBooleanOption((builder) =>
            builder
              .setName("deleted_only")
              .setDescription("Whether to only retrieve deleted messages")
          )
      )
  }

  private static async handleDeleted(attachments: boolean) {
    return await Prisma.message.findMany({
      where: {
        deleted: true,
      },
      include: {
        attachments: attachments,
        revisions: true,
      },
    })
  }

  private static async handleChannel(
    channelId: Snowflake,
    attachments: boolean,
    deleted: boolean
  ) {
    return await Prisma.message.findMany({
      where: deleted
        ? {
            deleted: true,
            channelId: channelId,
          }
        : {
            channelId: channelId,
          },
      include: {
        attachments: attachments,
        revisions: true,
      },
    })
  }

  private static async handleUser(
    userId: Snowflake,
    attachments: boolean,
    deleted: boolean
  ) {
    return await Prisma.message.findMany({
      where: deleted
        ? {
            userId: userId,
            deleted: true,
          }
        : {
            userId: userId,
          },
      include: {
        attachments: attachments,
        revisions: true,
      },
    })
  }

  private static async handleMessage(
    messageId: Snowflake,
    attachments: boolean,
    deleted: boolean
  ) {
    const message = await Prisma.message.findFirst({
      where: deleted
        ? {
            deleted: true,
            id: messageId,
          }
        : {
            id: messageId,
          },
      include: {
        attachments: attachments,
        revisions: true,
      },
    })

    return message ? [message] : []
  }

  public async handle(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!(await isFromOwner(interaction))) {
      throw new OwnerOnlyError()
    }

    const attachments = interaction.options.getBoolean("attachments") ?? false
    const deleted = interaction.options.getBoolean("deleted_only") ?? false

    let messages
    switch (interaction.options.getSubcommand()) {
      case "deleted":
        messages = await HistoryCommand.handleDeleted(attachments)
        break
      case "channel":
        messages = await HistoryCommand.handleChannel(
          interaction.options.getChannel("channel", true).id,
          attachments,
          deleted
        )
        break
      case "channel_id":
        messages = await HistoryCommand.handleChannel(
          interaction.options.getString("id", true),
          attachments,
          deleted
        )
        break
      case "user":
        messages = await HistoryCommand.handleUser(
          interaction.options.getUser("user", true).id,
          attachments,
          deleted
        )
        break
      case "message":
        messages = await HistoryCommand.handleMessage(
          interaction.options.getString("id", true),
          attachments,
          deleted
        )
        break
      default:
        throw new InvalidArgumentsError("Invalid subcommand")
    }

    const fileName = `${interaction.id}.zip`
    const output = createWriteStream(fileName)
    const archive = archiver("zip", { zlib: { level: 9 } })

    output.on("close", () => {
      interaction
        .editReply({
          files: [
            {
              attachment: fileName,
              name: "messages.zip",
            },
          ],
        })
        .catch((e) => {
          if (e instanceof Error) {
            void reportError(interaction.client, e)
          } else {
            console.log(e)
          }
        })
        .finally(() => {
          unlink(fileName).catch((e) => {
            if (e instanceof Error) {
              void reportError(interaction.client, e)
            } else {
              console.log(e)
            }
          })
        })
    })

    archive.on("warning", (err) => void reportError(interaction.client, err))
    archive.on("error", (err) => void reportError(interaction.client, err))

    archive.pipe(output)

    archive.append(JSON.stringify(messages, undefined, 4), {
      name: "messages.json",
    })

    for (const attachment of messages.flatMap((m) => m.attachments)) {
      if (!attachment) {
        // ???
        continue
      }

      const data = await download(Variables.s3ArchiveBucketName, attachment.key)
      if (data) {
        archive.append(data as Readable, { name: attachment.key })
      }
    }

    await archive.finalize()
  }
}
