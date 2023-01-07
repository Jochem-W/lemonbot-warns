import type { ClientEvents } from "discord.js"

export interface Handler<T extends keyof ClientEvents> {
  readonly event: T
  readonly once: boolean

  handle(...args: ClientEvents[T]): Promise<void>
}
