import {Client} from "discord.js"
import HandlerWrapper from "../types/handlerWrapper"

/**
 * Handler for ready
 */
export default class ReadyHandler extends HandlerWrapper {
    constructor() {
        super("ready")
    }

    async handle(client: Client) {
        if (client.user) {
            console.log(`Running as: ${client.user.tag}`)
        } else {
            console.log("Running without a user")
        }
    }
}