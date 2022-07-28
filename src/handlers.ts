import {ClientEvents} from "discord.js"
import {ReadyHandler} from "./handlers/readyHandler"
import {InteractionHandler} from "./handlers/interactionHandler"
import {Handler} from "./interfaces/handler"
import {CommandHandler} from "./handlers/commandHandler"
import {NicknameChangeHandler} from "./handlers/tagChangeHandler"
import {TagChangeHandler} from "./handlers/nicknameChangeHandler"
import {MemberRemoveHandler} from "./handlers/memberRemoveHandler"

export const Handlers: Handler<keyof ClientEvents>[] = [
    new CommandHandler(),
    new InteractionHandler(),
    new NicknameChangeHandler(),
    new ReadyHandler(),
    new TagChangeHandler(),
    new MemberRemoveHandler(),
]