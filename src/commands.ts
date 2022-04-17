import CommandWrapper from "./types/commandWrapper"

import NoteCommand from "./commands/note";
import WarningsCommand from "./commands/warnings";
import WarnCommand from "./commands/warn";

export const Commands: CommandWrapper[] = [
    new NoteCommand(),
    new WarnCommand(),
    new WarningsCommand()
]