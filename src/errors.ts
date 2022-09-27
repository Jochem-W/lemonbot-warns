import {Command} from "./interfaces/command"
import {Attachment, Channel, ChannelType, Client, CommandInteraction} from "discord.js"
import {CustomId} from "./models/customId"
import {DefaultConfig} from "./models/config"
import {makeErrorEmbed} from "./utilities/responseBuilder"

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

export class NoAutocompleteHandlerError extends BotError {
    public constructor(command: Command<CommandInteraction>) {
        super(`Command "${command.builder.name}" has no autocomplete handler.`)
    }
}

export class NoMessageComponentHandlerError extends BotError {
    public constructor(command: Command<CommandInteraction>) {
        super(`Command "${command.builder.name}" doesn't support message component interactions.`)
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
    public constructor(customId: string | CustomId) {
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
        if ("name" in channel) {
            super(`Channel "${channel.name}" (ID: "${channel.id}") is not of type "${expected}".`)
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

export class InvalidEmbedError extends CustomError {
    public constructor(message: string) {
        super(message)
    }
}

export async function reportError(client: Client, error: Error): Promise<void> {
    console.error(error)
    const channel = await client.channels.fetch(DefaultConfig.guild.errorChannel)
    if (!channel) {
        throw new ChannelNotFoundError(DefaultConfig.guild.errorChannel)
    }

    if (channel.type !== ChannelType.GuildText) {
        throw new InvalidChannelTypeError(channel, ChannelType.GuildText)
    }

    await channel.send({embeds: [makeErrorEmbed(error)]})
}