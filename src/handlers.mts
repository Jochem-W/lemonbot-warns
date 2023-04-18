import { LogBans } from "./handlers/guildBanAdd/logBans.mjs"
import { LogUnbans } from "./handlers/guildBanRemove/logUnbans.mjs"
import { DeleteWarnChannelOnLeave } from "./handlers/guildMemberRemove/deleteWarnChannelOnLeave.mjs"
import { AutocompleteHandler } from "./handlers/interactionCreate/autocompleteHandler.mjs"
import { CommandHandler } from "./handlers/interactionCreate/commandHandler.mjs"
import { MessageComponentHandler } from "./handlers/interactionCreate/messageComponentHandler.mjs"
import { ModalHandler } from "./handlers/interactionCreate/modalHandler.mjs"
import { AppendImagesToWarnings } from "./handlers/messageCreate/appendImagesToWarnings.mjs"
import { ReplyToDMs } from "./handlers/messageCreate/replyToDMs.mjs"
import { UploadAttachments } from "./handlers/messageCreate/uploadAttachments.mjs"
import { StartupHandler } from "./handlers/ready/startupHandler.mjs"
import type { Handler } from "./types/handler.mjs"
import type { ClientEvents } from "discord.js"

export const Handlers: Handler<keyof ClientEvents>[] = [
  new LogBans(),
  new LogUnbans(),
  new DeleteWarnChannelOnLeave(),
  new AutocompleteHandler(),
  new CommandHandler(),
  new MessageComponentHandler(),
  new ModalHandler(),
  new AppendImagesToWarnings(),
  new ReplyToDMs(),
  new UploadAttachments(),
  new StartupHandler(),
]
