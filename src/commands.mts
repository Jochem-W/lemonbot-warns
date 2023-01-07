import { Collection, CommandInteraction, Snowflake } from "discord.js"
import type { MessageContextMenuCommand } from "./models/messageContextMenuCommand.mjs"
import type { Command } from "./interfaces/command.mjs"
import { WarningsCommand } from "./commands/warningsCommand.mjs"
import type { UserContextMenuCommand } from "./models/userContextMenuCommand.mjs"
import { CheckBansCommand } from "./commands/checkBansCommand.mjs"
import type { ChatInputCommand } from "./models/chatInputCommand.mjs"
import { StatusCommand } from "./commands/statusCommand.mjs"
import { ReRegisterCommand } from "./commands/reRegisterCommand.mjs"
import { DumpJsonCommand } from "./commands/dumpJsonCommand.mjs"
import { S3Command } from "./commands/s3Command.mjs"
import { StatisticsCommand } from "./commands/statisticsCommand.mjs"
import { HistoryCommand } from "./commands/historyCommand.mjs"
import { EditCommand } from "./commands/editCommand.mjs"

export const SlashCommands: ChatInputCommand[] = [
  new CheckBansCommand(),
  new StatusCommand(),
  new WarningsCommand(),
  new ReRegisterCommand(),
  new DumpJsonCommand(),
  new S3Command(),
  new StatisticsCommand(),
  new HistoryCommand(),
  new EditCommand(),
]

export const MessageContextMenuCommands: MessageContextMenuCommand[] = []

export const UserContextMenuCommands: UserContextMenuCommand[] = []

export const RegisteredCommands = new Collection<
  Snowflake,
  Command<CommandInteraction>
>()
