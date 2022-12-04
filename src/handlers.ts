import type {ClientEvents} from "discord.js"
import {ReadyHandler} from "./handlers/readyHandler"
import {InteractionHandler} from "./handlers/interactionHandler"
import type {Handler} from "./interfaces/handler"
import {CommandHandler} from "./handlers/commandHandler"
import {MemberRemoveHandler} from "./handlers/memberRemoveHandler"
import {LemonbotLogHandler} from "./handlers/lemonbotLogHandler"
// import {MessageCreateHandler} from "./handlers/messageCreateHandler"
// import {MessageDeleteBulkHandler} from "./handlers/messageDeleteBulkHandler"
// import {MessageDeleteHandler} from "./handlers/messageDeleteHandler"
// import {MessageUpdateHandler} from "./handlers/messageUpdateHandler"

export const Handlers: Handler<keyof ClientEvents>[] = [
    new CommandHandler(),
    new InteractionHandler(),
    new ReadyHandler(),
    new MemberRemoveHandler(),
    new LemonbotLogHandler(),
    // new MessageCreateHandler(),
    // new MessageDeleteBulkHandler(),
    // new MessageDeleteHandler(),
    // new MessageUpdateHandler(),
]