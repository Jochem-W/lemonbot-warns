import HandlerWrapper from "./types/handlerWrapper"
import ReadyHandler from "./handlers/readyHandler"
import CommandHandler from "./handlers/commandHandler"

/**
 * @description The event handlers list which fires on each received event.
 */
export const Handlers: HandlerWrapper[] = [
    new ReadyHandler(),
    new CommandHandler(),
]