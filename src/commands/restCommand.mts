import { Discord } from "../clients.mjs"
import { InvalidMethodError, InvalidPathError } from "../errors.mjs"
import { ChatInputCommand } from "../models/chatInputCommand.mjs"
import { ensureOwner } from "../utilities/discordUtilities.mjs"
import {
  AttachmentBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  RequestMethod,
  REST,
} from "discord.js"
import type { InternalRequest } from "discord.js"
import { STATUS_CODES } from "http"

function isPath(value: string): value is `/${string}` {
  return value.startsWith("/")
}

function isMethod(value: string): value is RequestMethod {
  return (
    value === "DELETE" ||
    value === "GET" ||
    value === "PATCH" ||
    value === "POST" ||
    value === "PUT"
  )
}

export class RestCommand extends ChatInputCommand {
  public constructor() {
    super(
      "rest",
      "Make a Discord API request",
      PermissionFlagsBits.Administrator
    )
    this.builder
      .addStringOption((builder) =>
        builder.setName("path").setDescription("The API path").setRequired(true)
      )
      .addStringOption((builder) =>
        builder
          .setName("method")
          .setDescription("The HTTP request method")
          .setChoices(
            {
              name: "GET",
              value: "GET",
            },
            {
              name: "POST",
              value: "POST",
            },
            {
              name: "PUT",
              value: "PUT",
            },
            {
              name: "DELETE",
              value: "DELETE",
            },
            {
              name: "PATCH",
              value: "PATCH",
            }
          )
          .setRequired(true)
      )
      .addStringOption((builder) =>
        builder
          .setName("query")
          .setDescription("The query string, including leading '?'")
      )
      .addStringOption((builder) =>
        builder.setName("body").setDescription("The JSON request body")
      )
      .addStringOption((builder) =>
        builder
          .setName("token")
          .setDescription("The bot token to use for the request")
      )
  }

  public async handle(interaction: ChatInputCommandInteraction) {
    await ensureOwner(interaction)
    await interaction.deferReply({ ephemeral: true })

    const path = interaction.options.getString("path", true)
    const query = interaction.options.getString("query")
    const body = interaction.options.getString("body") ?? undefined
    const method = interaction.options.getString("method", true)

    if (!isPath(path)) {
      throw new InvalidPathError(path)
    }

    if (!isMethod(method)) {
      throw new InvalidMethodError(method)
    }

    const options: InternalRequest = {
      fullRoute: path,
      method: method,
      body: body ? JSON.parse(body) : undefined,
    }

    if (query) {
      options.query = new URLSearchParams(query)
    }

    const token = interaction.options.getString("token")
    let rest
    if (token !== null) {
      rest = new REST().setToken(token)
    } else {
      rest = Discord.rest
    }

    const response = await rest.raw(options)
    const json = JSON.stringify(await response.body.json(), undefined, 4).trim()

    const files: AttachmentBuilder[] = []
    const embed = new EmbedBuilder().setTitle(
      `${STATUS_CODES[response.statusCode] ?? ""} ${response.statusCode}`.trim()
    )
    if (json.length <= 2036) {
      embed.setDescription(`\`\`\`json\n${json}\n\`\`\``)
    } else {
      files.push(
        new AttachmentBuilder(Buffer.from(json), {
          name: "response.json",
        })
      )
    }

    await interaction.editReply({
      embeds: [embed],
      files,
    })
  }
}
