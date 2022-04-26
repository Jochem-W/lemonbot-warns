/**
 * Handler for events on the Discord API, via discord.js
 */
export default abstract class HandlerWrapper {
    public readonly eventName: string

    /**
     * @param eventName The event name to listen on. (see Events @ https://discord.js.org/#/docs/discord.js/stable/class/Client)
     */
    protected constructor(eventName: string) {
        this.eventName = eventName
    }

    /**
     * Custom code handler that processes the event received.
     * @param args The passed arguments from the event.
     */
    abstract handle(...args: any[]): Promise<void>
}
