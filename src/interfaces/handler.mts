import type { ClientEvents } from "discord.js"

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export interface Handler<T extends keyof ClientEvents> {
  readonly event: T
  readonly once: boolean

  handle(...args: ClientEvents[T]): Promise<void>
}
