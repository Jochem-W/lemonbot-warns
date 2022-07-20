import {Client, userMention} from "discord.js"
import {readFile, writeFile} from "fs/promises"
import {Config} from "../models/config"
import {Handler} from "../interfaces/handler"
import {ResponseBuilder} from "../utilities/responseBuilder"

type State = "UP" | "DOWN" | "RECREATE"

export class ReadyHandler implements Handler<"ready"> {
    public readonly event = "ready"

    public async handle(client: Client<true>): Promise<void> {
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
            embeds: [ResponseBuilder.makeEmbed(title)],
        })

        await setState("UP")

        process.on("SIGTERM", async () => {
            client.destroy()
            await setState("DOWN")
        })
    }
}

async function setState(status: State): Promise<void> {
    await writeFile("status", status, {encoding: "utf8"})
}

async function getState(): Promise<State> {
    try {
        return await readFile("status", "utf8") as State
    } catch (e) {
        return "RECREATE"
    }
}