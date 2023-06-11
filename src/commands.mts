import { CleanCommand } from "./commands/cleanCommand.mjs"
import { DumpJsonCommand } from "./commands/dumpJsonCommand.mjs"
import { EditCommand } from "./commands/editCommand.mjs"
import { EvalCommand } from "./commands/evalCommand.mjs"
import { EvalMessageCommand } from "./commands/evalMessageCommand.mjs"
import { RestCommand } from "./commands/restCommand.mjs"
import { S3Command } from "./commands/s3Command.mjs"
import { SearchCommand } from "./commands/searchCommand.mjs"
import { ShowEmbedCommand } from "./commands/showEmbedCommand.mjs"
import { StatisticsCommand } from "./commands/statisticsCommand.mjs"
import { StatusCommand } from "./commands/statusCommand.mjs"
import { WarningsCommand } from "./commands/warningsCommand.mjs"
import { WarningsContextCommand } from "./commands/warningsContextCommand.mjs"
import type { ChatInputCommand } from "./models/chatInputCommand.mjs"
import type { MessageContextMenuCommand } from "./models/messageContextMenuCommand.mjs"
import type { UserContextMenuCommand } from "./models/userContextMenuCommand.mjs"
import type { Command } from "./types/command.mjs"
import { Collection, CommandInteraction, type Snowflake } from "discord.js"

export const SlashCommands: ChatInputCommand[] = [
  new StatusCommand(),
  new WarningsCommand(),
  new DumpJsonCommand(),
  new S3Command(),
  new StatisticsCommand(),
  new EditCommand(),
  new SearchCommand(),
  new RestCommand(),
  new EvalCommand(),
  new ShowEmbedCommand(),
  new CleanCommand(),
]

export const MessageContextMenuCommands: MessageContextMenuCommand[] = [
  new EvalMessageCommand(),
]

export const UserContextMenuCommands: UserContextMenuCommand[] = [
  new WarningsContextCommand(),
]

export const RegisteredCommands = new Collection<
  Snowflake,
  Command<CommandInteraction>
>()
