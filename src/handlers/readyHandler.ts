import {Client, userMention} from "discord.js"
import HandlerWrapper from "../wrappers/handlerWrapper"
import {readFile, writeFile} from "fs/promises"
import EmbedUtilities from "../utilities/embedUtilities"
import {Config} from "../config"

type State = "UP" | "DOWN" | "RECREATE"

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

        let title = "Bot "
        switch (await getState()) {
        case "UP":
            title += "crashed"
            break
        case "DOWN":
            title += "restarted"
            break
        case "RECREATE":
            title += "updated"
            break
        }

        const channel = await client.channels.fetch(Config.restartChannel)
        if (!channel?.isTextBased()) {
            throw new Error("Restart channel isn't a text channel")
        }

        await channel.send({
            content: userMention(Config.restartUser),
            embeds: [EmbedUtilities.makeEmbed(title)],
        })

        await setState("UP")

        process.on("SIGTERM", async () => {
            client.destroy()
            await setState("DOWN")
        })
    }
}

async function setState(status: State) {
    await writeFile("status", status, {encoding: "utf8"})
}

async function getState(): Promise<State> {
    try {
        return await readFile("status", "utf8") as State
    } catch (e) {
        return "RECREATE"
    }
}