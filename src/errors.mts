import type { Command } from "./interfaces/command.mjs"
import { DefaultConfig } from "./models/config.mjs"
import type { CustomId } from "./models/customId.mjs"
import { fetchChannel } from "./utilities/discordUtilities.mjs"
import { makeErrorEmbed } from "./utilities/embedUtilities.mjs"
import type { FormResponse } from "./utilities/googleForms.mjs"
import {
  Attachment,
  Channel,
  ChannelType,
  Client,
  CommandInteraction,
  Snowflake,
} from "discord.js"

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
  public constructor(command: Command<CommandInteraction>) {
    super(`Command "${command.builder.name}" has no autocomplete handler.`)
  }
}

export class NoMessageComponentHandlerError extends BotError {
  public constructor(command: Command<CommandInteraction>) {
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
    super(
      `The file "${attachment.name ?? attachment.id}" has an invalid filetype.`
    )
  }
}

export class ImageOnlyError extends BotError {
  public constructor(attachment: Attachment) {
    super(`The file "${attachment.name ?? attachment.id}" is not an image.`)
  }
}

export class InvalidCustomIdError extends BotError {
  public constructor(customId: string | CustomId) {
    super(`Invalid custom ID "${customId.toString()}".`)
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

export class InvalidEmbedError extends CustomError {
  public constructor(message: string) {
    super(message)
  }
}

export class PenaltyNotFoundError extends CustomError {
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
  public constructor(response: FormResponse) {
    super(JSON.stringify(response, undefined, 4))
  }
}

export async function reportError(client: Client, error: Error): Promise<void> {
  console.error(error)
  const channel = await fetchChannel(
    client,
    DefaultConfig.guild.errorChannel,
    ChannelType.GuildText
  )
  await channel.send({ embeds: [makeErrorEmbed(error)] })
}
