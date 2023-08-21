import { AppendImagesHandler } from "./handlers/appendImagesHandler.mjs"
import { CheckBanAppealsHandler } from "./handlers/checkBanAppealsHandler.mjs"
import { DeleteWarnChannelHandler } from "./handlers/deleteWarnChannelHandler.mjs"
import { InteractionHandler } from "./handlers/interactionHandler.mjs"
import { LogBansHandler } from "./handlers/logBansHandler.mjs"
import { LogUnbansHandler } from "./handlers/logUnbansHandler.mjs"
import { ReplyToDmsHandler } from "./handlers/replyToDmsHandler.mjs"
import { StartupHandler } from "./handlers/startupHandler.mjs"
import type { Handler } from "./models/handler.mjs"
import type { ClientEvents } from "discord.js"

export const Handlers: Handler<keyof ClientEvents>[] = [
  AppendImagesHandler,
  CheckBanAppealsHandler,
  DeleteWarnChannelHandler,
  InteractionHandler,
  LogBansHandler,
  LogUnbansHandler,
  ReplyToDmsHandler,
  StartupHandler,
]
