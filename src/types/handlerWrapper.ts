/**
 * Handler for events on the Discord API, via discord.js
 */
export default class HandlerWrapper {
    public readonly eventName: string
    private readonly handlerName: string

    /**
     * @param eventName The event name to listen on. (see Events @ https://discord.js.org/#/docs/discord.js/stable/class/Client)
     * @param handlerName The internal handler name that will be displayed on startup.
     */
    constructor(eventName: string, handlerName: string) {
        this.eventName = eventName
        this.handlerName = handlerName

        console.log("Constructed", handlerName, "event handler!")
    }

    /**
     * Custom code handler that processes the event received.
     * @param args The passed arguments from the event.
     */
    async handle(...args: any[]) {
    }
}