import CommandWrapper from "./types/commandWrapper"
import WarningsCommand from "./commands/warnings";
import WarnCommand from "./commands/warn";

export const Commands: CommandWrapper[] = [
    new WarnCommand(),
    new WarningsCommand()
]