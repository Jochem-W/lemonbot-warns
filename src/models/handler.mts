import type { ClientEvents } from "discord.js"

export function handler<T extends keyof ClientEvents>({
  event,
  once,
  handle,
}: {
  event: T
  once: boolean
  handle: (...args: ClientEvents[T]) => Promise<void>
}) {
  return { event, once, handle }
}
