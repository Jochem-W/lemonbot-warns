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
import MessageContextMenuCommandConstructor from "./models/messageContextMenuCommandConstructor"
import CommandConstructor from "./models/commandConstructor"
import UserContextMenuCommandConstructor from "./models/userContextMenuCommandConstructor"
// import MessageReportCommand from "./commands/messageReportCommand"

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

export const MessageContextMenuCommandConstructors: Readonly<MessageContextMenuCommandConstructor<MessageContextMenuCommandInteraction>[]> = [
    // new MessageReportCommand(),
]

export const UserContextMenuCommandConstructors: Readonly<UserContextMenuCommandConstructor<UserContextMenuCommandInteraction>[]> = []