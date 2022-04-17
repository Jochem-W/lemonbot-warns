import CommandWrapper from "./types/commandWrapper"

import NoteCommand from "./commands/note"
import WarningsCommand from "./commands/warnings"
import WarnCommand from "./commands/warn"
import NotesCommand from "./commands/notes"
import SyncCommand from "./commands/sync"

export const Commands: CommandWrapper[] = [
    new NoteCommand(),
    new NotesCommand(),
    new WarnCommand(),
    new WarningsCommand(),
    new SyncCommand(),
]