import type {ClientEvents} from "discord.js"
import {ReadyHandler} from "./handlers/readyHandler"
import {InteractionHandler} from "./handlers/interactionHandler"
import type {Handler} from "./interfaces/handler"
import {CommandHandler} from "./handlers/commandHandler"
import {MemberRemoveHandler} from "./handlers/memberRemoveHandler"
import {GuildBanAddHandler} from "./handlers/guildBanAddHandler"

export const Handlers: Handler<keyof ClientEvents>[] = [
    new CommandHandler(),
    new InteractionHandler(),
    new ReadyHandler(),
    new MemberRemoveHandler(),
    new GuildBanAddHandler(),
]