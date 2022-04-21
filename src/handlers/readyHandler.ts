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
        console.log("Running as:", client.user!.tag + "!")
    }
}