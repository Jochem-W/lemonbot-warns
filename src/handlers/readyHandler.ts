import {Client} from "discord.js"
import HandlerWrapper from "../types/handlerWrapper"

/**
 * @description Handler for events on the Discord API, via discord.js
 */
export default class ReadyHandler extends HandlerWrapper {
    constructor() {
        super("ready", "Ready")
    }

    async handle(...args: any) {
        const [[bot]]: [[Client]] = args

        console.log("Running as:", bot.user?.tag + "!")
    }
}