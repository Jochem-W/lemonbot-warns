import type { ClientEvents } from "discord.js"
import { ReadyHandler } from "./handlers/readyHandler.mjs"
import { InteractionHandler } from "./handlers/interactionHandler.mjs"
import type { Handler } from "./interfaces/handler.mjs"
import { CommandHandler } from "./handlers/commandHandler.mjs"
import { MemberRemoveHandler } from "./handlers/memberRemoveHandler.mjs"
import { GuildBanAddHandler } from "./handlers/guildBanAddHandler.mjs"
import { MessageCreateHandler } from "./handlers/messageCreateHandler.mjs"
import { MessageUpdateHandler } from "./handlers/messageUpdateHandler.mjs"
import { MessageDeleteHandler } from "./handlers/messageDeleteHandler.mjs"
import { GuildBanRemoveHandler } from "./handlers/guildBanRemoveHandler.mjs"

export const Handlers: Handler<keyof ClientEvents>[] = [
  new CommandHandler(),
  new InteractionHandler(),
  new ReadyHandler(),
  new MemberRemoveHandler(),
  new GuildBanAddHandler(),
  new MessageCreateHandler(),
  new MessageUpdateHandler(),
  new MessageDeleteHandler(),
  new GuildBanRemoveHandler(),
]
