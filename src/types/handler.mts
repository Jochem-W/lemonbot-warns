import type { ClientEvents } from "discord.js"

export type Handler<T extends keyof ClientEvents> = {
  readonly event: T
  readonly once: boolean
  handle(...data: ClientEvents[T]): Promise<void>
}
