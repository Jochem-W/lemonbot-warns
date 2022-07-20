import {ClientEvents} from "discord.js"

export interface Handler<T extends keyof ClientEvents> {
    readonly event: T

    handle(...args: ClientEvents[T]): Promise<void>
}