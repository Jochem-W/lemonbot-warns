import CommandWrapper from "./interfaces/commandWrapper"
import NoteCommand from "./commands/note"
import NotesCommand from "./commands/notes"
import StatusCommand from "./commands/status"
import SyncCommand from "./commands/sync"
import WarnCommand from "./commands/warn"
import WarningsCommand from "./commands/warnings"

export const CommandWrappers: CommandWrapper[] = [
    new NoteCommand(),
    new NotesCommand(),
    new StatusCommand(),
    new SyncCommand(),
    new WarnCommand(),
    new WarningsCommand()
]
