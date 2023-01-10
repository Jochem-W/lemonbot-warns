import { CheckBansCommand } from "./commands/checkBansCommand.mjs"
import { DumpJsonCommand } from "./commands/dumpJsonCommand.mjs"
import { EditCommand } from "./commands/editCommand.mjs"
import { HistoryCommand } from "./commands/historyCommand.mjs"
import { S3Command } from "./commands/s3Command.mjs"
import { SearchCommand } from "./commands/searchCommand.mjs"
import { StatisticsCommand } from "./commands/statisticsCommand.mjs"
import { StatusCommand } from "./commands/statusCommand.mjs"
import { WarningsCommand } from "./commands/warningsCommand.mjs"
import type { Command } from "./interfaces/command.mjs"
import type { ChatInputCommand } from "./models/chatInputCommand.mjs"
import type { MessageContextMenuCommand } from "./models/messageContextMenuCommand.mjs"
import type { UserContextMenuCommand } from "./models/userContextMenuCommand.mjs"
import { Collection, CommandInteraction, Snowflake } from "discord.js"

export const SlashCommands: ChatInputCommand[] = [
  new CheckBansCommand(),
  new StatusCommand(),
  new WarningsCommand(),
  new DumpJsonCommand(),
  new S3Command(),
  new StatisticsCommand(),
  new HistoryCommand(),
  new EditCommand(),
  new SearchCommand(),
]

export const MessageContextMenuCommands: MessageContextMenuCommand[] = []

export const UserContextMenuCommands: UserContextMenuCommand[] = []

export const RegisteredCommands = new Collection<
  Snowflake,
  Command<CommandInteraction>
>()
