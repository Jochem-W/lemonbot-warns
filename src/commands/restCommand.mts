import { InvalidMethodError, InvalidPathError } from "../errors.mjs"
import { slashCommand, slashOption } from "../models/slashCommand.mjs"
import { ensureOwner } from "../utilities/discordUtilities.mjs"
import {
  AttachmentBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  RequestMethod,
  REST,
  type InternalRequest,
  SlashCommandStringOption,
} from "discord.js"
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

export const RestCommand = slashCommand({
  name: "rest",
  description: "Make a Discord API request",
  defaultMemberPermissions: PermissionFlagsBits.Administrator,
  dmPermission: false,
  options: [
    slashOption(true, {
      option: new SlashCommandStringOption()
        .setName("path")
        .setDescription("The API path, including leading '/'"),
    }),
    slashOption(
      true,
      new SlashCommandStringOption()
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
          },
        ),
    ),
    slashOption(
      false,
      new SlashCommandStringOption()
        .setName("query")
        .setDescription("The query string, including leading '?'"),
    ),
    slashOption(
      false,
      new SlashCommandStringOption()
        .setName("body")
        .setDescription("The JSON request body"),
    ),
    slashOption(
      false,
      new SlashCommandStringOption()
        .setName("token")
        .setDescription("The bot token to use for the request"),
    ),
  ],
  async handle(interaction, path, method, query, body, token) {
    await ensureOwner(interaction)
    await interaction.deferReply({ ephemeral: true })

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

    let rest
    if (token !== null) {
      rest = new REST().setToken(token)
    } else {
      rest = interaction.client.rest
    }

    const response = await rest.queueRequest(options)
    const json = JSON.stringify(await response.json(), undefined, 4).trim()

    const files: AttachmentBuilder[] = []
    const embed = new EmbedBuilder().setTitle(
      `${STATUS_CODES[response.status] ?? ""} ${response.status}`.trim(),
    )
    if (json.length <= 2036) {
      embed.setDescription(`\`\`\`json\n${json}\n\`\`\``)
    } else {
      files.push(
        new AttachmentBuilder(Buffer.from(json), {
          name: "response.json",
        }),
      )
    }

    await interaction.editReply({
      embeds: [embed],
      files,
    })
  },
})
