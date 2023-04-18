import { GuildBanAddHandler } from "./handlers/guildBanAdd/guildBanAddHandler.mjs"
import { GuildBanRemoveHandler } from "./handlers/guildBanRemove/guildBanRemoveHandler.mjs"
import { MemberRemoveHandler } from "./handlers/guildMemberRemove/memberRemoveHandler.mjs"
import { CommandHandler } from "./handlers/interactionCreate/commandHandler.mjs"
import { InteractionHandler } from "./handlers/interactionCreate/interactionHandler.mjs"
import { AppendImageHandler } from "./handlers/messageCreate/appendImageHandler.mjs"
import { MessageCreateHandler } from "./handlers/messageCreate/messageCreateHandler.mjs"
import { ReadyHandler } from "./handlers/ready/readyHandler.mjs"
import type { Handler } from "./types/handler.mjs"
import type { ClientEvents } from "discord.js"

export const Handlers: Handler<keyof ClientEvents>[] = [
  new CommandHandler(),
  new InteractionHandler(),
  new ReadyHandler(),
  new MemberRemoveHandler(),
  new GuildBanAddHandler(),
  new MessageCreateHandler(),
  new GuildBanRemoveHandler(),
  new AppendImageHandler(),
]
