import { EditCommand } from "./commands/editCommand.mjs"
import { EvalCommand } from "./commands/evalCommand.mjs"
import { EvalMessageCommand } from "./commands/evalMessageCommand.mjs"
import { RestCommand } from "./commands/restCommand.mjs"
import { SearchCommand } from "./commands/searchCommand.mjs"
import { ShowEmbedCommand } from "./commands/showEmbedCommand.mjs"
import { WarnCommand } from "./commands/warnCommand.mjs"
import { WarningsCommand } from "./commands/warningsCommand.mjs"
import { WarningsContextCommand } from "./commands/warningsContextCommand.mjs"
import type { Command } from "./types/command.mjs"
import { ApplicationCommandType, Collection, type Snowflake } from "discord.js"

export const SlashCommands: Command<ApplicationCommandType.ChatInput>[] = [
  WarningsCommand,
  EditCommand,
  SearchCommand,
  RestCommand,
  EvalCommand,
  ShowEmbedCommand,
  WarnCommand,
]

export const MessageContextMenuCommands: Command<ApplicationCommandType.Message>[] =
  [EvalMessageCommand]

export const UserContextMenuCommands: Command<ApplicationCommandType.User>[] = [
  WarningsContextCommand,
]

export const RegisteredCommands = new Collection<
  Snowflake,
  Command<ApplicationCommandType>
>()
