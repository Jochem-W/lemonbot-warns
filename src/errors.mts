import { Discord, Prisma } from "./clients.mjs"
import type { Command } from "./types/command.mjs"
import { makeErrorEmbed } from "./utilities/embedUtilities.mjs"
import type { forms_v1 } from "@googleapis/forms"
import type { WarningGuild } from "@prisma/client"
import {
  Attachment,
  ChannelType,
  CommandInteraction,
  Guild,
  type Channel,
  type Snowflake,
  ApplicationCommandType,
} from "discord.js"
import type { DateTime } from "luxon"

class CustomError extends Error {
  public constructor(message: string) {
    super(message)
    this.name = this.constructor.name
  }
}

export class BotError extends CustomError {
  public constructor(message: string) {
    super(message)
  }
}

export class InvalidArgumentsError extends BotError {
  public constructor(message: string) {
    super(message)
  }
}

export class CommandNotFoundError extends BotError {
  public constructor(message: string) {
    super(message)
  }
}

export class CommandNotFoundByIdError extends CommandNotFoundError {
  public constructor(commandId: string) {
    super(`Command with ID "${commandId}" couldn't be found.`)
  }
}

export class CommandNotFoundByNameError extends CommandNotFoundError {
  public constructor(commandName: string) {
    super(`Command with name "${commandName}" couldn't be found.`)
  }
}

export class SubcommandGroupNotFoundError extends BotError {
  public constructor(interaction: CommandInteraction, subcommandGroup: string) {
    super(
      `Couldn't find subcommand group ${subcommandGroup} for command ${interaction.commandName} (${interaction.commandId})`
    )
  }
}

export class SubcommandNotFoundError extends BotError {
  public constructor(interaction: CommandInteraction, subcommand: string) {
    super(
      `Couldn't find subcommand ${subcommand} for command ${interaction.commandName} (${interaction.commandId})`
    )
  }
}

export class NoAutocompleteHandlerError extends BotError {
  public constructor(command: Command<ApplicationCommandType>) {
    super(`Command "${command.builder.name}" has no autocomplete handler.`)
  }
}

export class NoMessageComponentHandlerError extends BotError {
  public constructor(command: Command<ApplicationCommandType>) {
    super(
      `Command "${command.builder.name}" doesn't support message component interactions.`
    )
  }
}

export class NoPermissionError extends BotError {
  public constructor() {
    super("You don't have permission to use this command.")
  }
}

export class GuildOnlyError extends BotError {
  public constructor() {
    super("This command can only be used in a server.")
  }
}

export class InvalidPenaltyError extends BotError {
  public constructor(penalty: string) {
    super(`Invalid penalty "${penalty}".`)
  }
}

export class NoContentTypeError extends BotError {
  public constructor(attachment: Attachment) {
    super(`The file "${attachment.name}" has an invalid filetype.`)
  }
}

export class ImageOnlyError extends BotError {
  public constructor(attachment: Attachment) {
    super(`The file "${attachment.name}" is not an image.`)
  }
}

export class InvalidCustomIdError extends BotError {
  public constructor(customId: string) {
    super(`Invalid custom ID "${customId}".`)
  }
}

export class ChannelNotFoundError extends BotError {
  public constructor(channelId: string) {
    super(`Channel with ID "${channelId}" couldn't be found.`)
  }
}

export class InvalidChannelTypeError extends BotError {
  public constructor(channel: Channel, expected: ChannelType) {
    if ("name" in channel && channel.name) {
      super(
        `Channel "${channel.name}" (ID: "${channel.id}") is not of type "${expected}".`
      )
      return
    }

    super(`Channel "${channel.id}" is not of type "${expected}".`)
  }
}

export class OwnerOnlyError extends BotError {
  public constructor() {
    super("This command can only be used by the bot owner.")
  }
}

export class AuditLogNotFoundError extends BotError {
  public constructor(message: string) {
    super(message)
  }
}

export class InvalidAuditLogEntryError extends BotError {
  public constructor(message: string) {
    super(message)
  }
}

export class NoValidCodeError extends BotError {
  public constructor(message: string) {
    super(message)
  }
}

export class ButtonNotFoundError extends BotError {
  public constructor(name: string) {
    super(`Couldn't find a button with name "${name}"`)
  }
}

export class ModalNotFoundError extends BotError {
  public constructor(name: string) {
    super(`Couldn't find a modal with name "${name}"`)
  }
}

export class DuplicateNameError extends BotError {
  public constructor(type: "button" | "modal", name: string) {
    super(`A ${type} with the name ${name} already exists`)
  }
}

export class UnregisteredNameError extends BotError {
  public constructor(type: "button" | "modal", name: string) {
    super(`A ${type} with the name ${name} doesn't exist`)
  }
}

export class InvalidPathError extends BotError {
  public constructor(value: string) {
    super(`The supplied path ${value} is invalid`)
  }
}

export class InvalidMethodError extends BotError {
  public constructor(value: string) {
    super(`The supplied method ${value} is invalid`)
  }
}

export class InvalidEmbedError extends CustomError {
  public constructor(message: string) {
    super(message)
  }
}

export class NoMessageRevisionsError extends CustomError {
  public constructor(id: Snowflake) {
    super(`Message with ID "${id}" has no revisions`)
  }
}

export class InvalidFormResponseError extends CustomError {
  public constructor(
    response: forms_v1.Schema$FormResponse | forms_v1.Schema$Form
  ) {
    super(JSON.stringify(response, undefined, 4))
  }
}

export class InvalidStreamError extends CustomError {
  public constructor() {
    super("The stream isn't an instance of Readable")
  }
}

export class InvalidDateTimeError extends CustomError {
  public constructor(date: DateTime) {
    super(`The date ${JSON.stringify(date.toObject())} is invalid`)
  }
}

export async function logError(
  error: Error,
  guild?: Guild | WarningGuild | string | null
) {
  console.error(error)
  if (guild instanceof Guild) {
    guild = await Prisma.warningGuild.findFirst({ where: { id: guild.id } })
  } else if (typeof guild === "string") {
    guild = await Prisma.warningGuild.findFirst({ where: { id: guild } })
  }

  if (guild && !guild.errorChannel) {
    guild = null
  }

  const guilds = guild ? [guild] : await Prisma.warningGuild.findMany()
  for (const guild of guilds) {
    if (!guild.errorChannel) {
      continue
    }

    const channel = await Discord.channels.fetch(guild.errorChannel, {
      allowUnknownGuild: true,
    })
    if (!channel?.isTextBased()) {
      console.error(guild, "has an incorrect errorChannel")
      continue
    }

    await channel.send({ embeds: [makeErrorEmbed(error)] })
  }
}
