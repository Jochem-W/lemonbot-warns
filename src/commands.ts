import {ChatInputCommandInteraction, Collection, Snowflake} from "discord.js"
import CommandConstructor from "./models/commandConstructor"
import NoteCommand from "./commands/noteCommand"
import StatusCommand from "./commands/statusCommand"
import SyncCommand from "./commands/syncCommand"
import WarnCommand from "./commands/warnCommand"
import WarningsCommand from "./commands/warningsCommand"
import WatchlistCommand from "./commands/watchlistCommand"
import CheckBansCommand from "./commands/checkBansCommand"

// TODO: fix this
export const ChatInputCommands = new Collection<Snowflake, CommandConstructor<ChatInputCommandInteraction>>()

export const ChatInputCommandConstructors: Readonly<CommandConstructor<ChatInputCommandInteraction>[]> = [
    new CheckBansCommand(),
    new NoteCommand(),
    new StatusCommand(),
    new SyncCommand(),
    new WarnCommand(),
    new WarningsCommand(),
    new WatchlistCommand(),
]