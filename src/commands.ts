import CommandWrapper from "./interfaces/commandWrapper"
import NoteCommand from "./commands/noteCommand"
import NotesCommand from "./commands/notesCommand"
import StatusCommand from "./commands/statusCommand"
import SyncCommand from "./commands/syncCommand"
import WarnCommand from "./commands/warnCommand"
import WarningsCommand from "./commands/warningsCommand"

import NoteContextCommand from "./commands/noteContextCommand"

export const CommandWrappers: CommandWrapper[] = [
    new NoteCommand(),
    new NotesCommand(),
    new StatusCommand(),
    new SyncCommand(),
    new WarnCommand(),
    new WarningsCommand(),

    new NoteContextCommand(),
]
