import { LogBans } from "./handlers/guildBanAdd/logBans.mjs"
import { LogUnbans } from "./handlers/guildBanRemove/logUnbans.mjs"
import { DeleteWarnChannelOnLeave } from "./handlers/guildMemberRemove/deleteWarnChannelOnLeave.mjs"
import { AppendImagesToWarnings } from "./handlers/messageCreate/appendImagesToWarnings.mjs"
import { ReplyToDMs } from "./handlers/messageCreate/replyToDMs.mjs"
import { UploadAttachments } from "./handlers/messageCreate/uploadAttachments.mjs"
import { StartupHandler } from "./handlers/ready/startupHandler.mjs"
import type { Handler } from "./models/handler.mjs"
import type { ClientEvents } from "discord.js"

export const Handlers: Handler<keyof ClientEvents>[] = [
  LogBans,
  LogUnbans,
  DeleteWarnChannelOnLeave,
  AppendImagesToWarnings,
  ReplyToDMs,
  UploadAttachments,
  StartupHandler,
]
