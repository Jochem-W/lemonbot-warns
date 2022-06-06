import {
    ChatInputCommandInteraction,
    Collection,
    CommandInteraction,
    MessageContextMenuCommandInteraction,
    Snowflake,
    UserContextMenuCommandInteraction,
} from "discord.js"
import SlashCommandConstructor from "./models/slashCommandConstructor"
import NoteCommand from "./commands/noteCommand"
import StatusCommand from "./commands/statusCommand"
import SyncCommand from "./commands/syncCommand"
import WarnCommand from "./commands/warnCommand"
import WarningsCommand from "./commands/warningsCommand"
import WatchlistCommand from "./commands/watchlistCommand"
import CheckBansCommand from "./commands/checkBansCommand"
import ContextCommandConstructor from "./models/contextCommandConstructor"
import CommandConstructor from "./models/commandConstructor"

export const Commands = new Collection<Snowflake, CommandConstructor<CommandInteraction>>()

export const ChatInputCommandConstructors: Readonly<SlashCommandConstructor<ChatInputCommandInteraction>[]> = [
    new CheckBansCommand(),
    new NoteCommand(),
    new StatusCommand(),
    new SyncCommand(),
    new WarnCommand(),
    new WarningsCommand(),
    new WatchlistCommand(),
]

export const MessageContextMenuCommandConstructors: Readonly<ContextCommandConstructor<MessageContextMenuCommandInteraction>[]> = [
    // new ReportCommand(),
]

export const UserContextMenuCommandConstructors: Readonly<ContextCommandConstructor<UserContextMenuCommandInteraction>[]> = []