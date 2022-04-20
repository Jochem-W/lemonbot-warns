import HandlerWrapper from "./types/handlerWrapper"
import ReadyHandler from "./handlers/readyHandler"
import CommandHandler from "./handlers/commandHandler"
import GuildMemberUpdateHandler from "./handlers/guildMemberUpdateHandler";
import UserUpdateHandler from "./handlers/userUpdateHandler";

/**
 * @description The event handlers list which fires on each received event.
 */
export const Handlers: HandlerWrapper[] = [
    new ReadyHandler(),
    new CommandHandler(),
    new GuildMemberUpdateHandler(),
    new UserUpdateHandler(),
]