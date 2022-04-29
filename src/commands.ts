import {ChatInputCommandInteraction, Collection, Snowflake} from "discord.js"
import CommandConstructor from "./models/commandConstructor"
import NoteCommand from "./commands/noteCommand"
import NotesCommand from "./commands/notesCommand"
import StatusCommand from "./commands/statusCommand"
import SyncCommand from "./commands/syncCommand"
import WarnCommand from "./commands/warnCommand"
import WarningsCommand from "./commands/warningsCommand"

// TODO: fix this
export const ChatInputCommands = new Collection<Snowflake, CommandConstructor<ChatInputCommandInteraction>>()

export const ChatInputCommandConstructors: Readonly<CommandConstructor<ChatInputCommandInteraction>[]> = [
    new NoteCommand(),
    new NotesCommand(),
    new StatusCommand(),
    new SyncCommand(),
    new WarnCommand(),
    new WarningsCommand(),
]