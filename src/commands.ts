import {Collection, CommandInteraction, Snowflake} from "discord.js"
import {MessageContextMenuCommand} from "./models/messageContextMenuCommand"
import {Command} from "./interfaces/command"
import {WarningsCommand} from "./commands/warningsCommand"
import {UserContextMenuCommand} from "./models/userContextMenuCommand"
import {CheckBansCommand} from "./commands/checkBansCommand"
import {ChatInputCommand} from "./models/chatInputCommand"
import {StatusCommand} from "./commands/statusCommand"
import {ReRegisterCommand} from "./commands/reRegisterCommand"
import {DumpJsonCommand} from "./commands/dumpJsonCommand"
import {S3Command} from "./commands/s3Command"

export const SlashCommands: ChatInputCommand[] = [
    new CheckBansCommand(),
    new StatusCommand(),
    new WarningsCommand(),
    new ReRegisterCommand(),
    new DumpJsonCommand(),
    new S3Command(),
]

export const MessageContextMenuCommands: MessageContextMenuCommand[] = []

export const UserContextMenuCommands: UserContextMenuCommand[] = []

export const RegisteredCommands = new Collection<Snowflake, Command<CommandInteraction>>()