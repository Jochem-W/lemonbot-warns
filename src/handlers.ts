import HandlerWrapper from "./types/handlerWrapper"
import ReadyHandler from "./handlers/readyHandler"
import CommandHandler from "./handlers/commandHandler"
import NicknameChangeHandler from "./handlers/nicknameChangeHandler";
import TagChangeHandler from "./handlers/tagChangeHandler";

/**
 * @description The event handlers list which fires on each received event.
 */
export const Handlers: HandlerWrapper[] = [
    new ReadyHandler(),
    new CommandHandler(),
    new NicknameChangeHandler(),
    new TagChangeHandler(),
]