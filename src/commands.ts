import {Collection, CommandInteraction, Snowflake} from "discord.js"
import {WarnCommand} from "./commands/warnCommand"
import {MessageContextMenuCommand} from "./models/messageContextMenuCommand"
import {Command} from "./interfaces/command"
import {WarningsCommand} from "./commands/warningsCommand"
import {UserContextMenuCommand} from "./models/userContextMenuCommand"
import {CheckBansCommand} from "./commands/checkBansCommand"
import {ChatInputCommand} from "./models/chatInputCommand"
import {StatusCommand} from "./commands/statusCommand"
import {UpdateNamesCommand} from "./commands/updateNamesCommand"

export const SlashCommands: ChatInputCommand[] = [
    new CheckBansCommand(),
    new StatusCommand(),
    new UpdateNamesCommand(),
    new WarnCommand(),
    new WarningsCommand(),
]

export const MessageContextMenuCommands: MessageContextMenuCommand[] = []

export const UserContextMenuCommands: UserContextMenuCommand[] = []

export const RegisteredCommands = new Collection<Snowflake, Command<CommandInteraction>>()