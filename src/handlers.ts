import {ClientEvents} from "discord.js"
import {ReadyHandler} from "./handlers/readyHandler"
import {InteractionHandler} from "./handlers/interactionHandler"
import {Handler} from "./interfaces/handler"
import {CommandHandler} from "./handlers/commandHandler"
import {NicknameChangeHandler} from "./handlers/nicknameChangeHandler"
import {TagChangeHandler} from "./handlers/tagChangeHandler"
import {MemberRemoveHandler} from "./handlers/memberRemoveHandler"

export const Handlers: Handler<keyof ClientEvents>[] = [
    new CommandHandler(),
    new InteractionHandler(),
    new NicknameChangeHandler(),
    new ReadyHandler(),
    new TagChangeHandler(),
    new MemberRemoveHandler(),
]