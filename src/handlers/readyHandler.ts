import {ChannelType, Client, userMention} from "discord.js"
import {readFile, writeFile} from "fs/promises"
import {Config} from "../models/config"
import {Handler} from "../interfaces/handler"
import {ResponseBuilder} from "../utilities/responseBuilder"
import {ChannelNotFoundError, InvalidChannelTypeError} from "../errors"
import {writeFileSync} from "fs"

type State = "UP" | "DOWN" | "RECREATE"

export class ReadyHandler implements Handler<"ready"> {
    public readonly event = "ready"

    public async handle(client: Client<true>): Promise<void> {
        console.log(`Running as: ${client.user.tag}`)

        let title = "Bot "
        switch (await getState()) {
            case "UP":
                title += "crashed"
                break
            case "DOWN":
                title += "restarted"
                break
            case "RECREATE":
                title += "redeployed"
                break
        }

        const channel = await client.channels.fetch(Config.restartChannel)
        if (!channel) {
            throw new ChannelNotFoundError(Config.restartChannel)
        }

        if (!channel.isTextBased() || channel.type !== ChannelType.GuildText) {
            throw new InvalidChannelTypeError(channel, ChannelType.GuildText)
        }

        await channel.send({
            content: userMention(Config.restartUser),
            embeds: [ResponseBuilder.makeEmbed(title)],
        })

        await setState("UP")

        process.on("SIGINT", () => process.exit())
        process.on("SIGTERM", () => process.exit())
        process.on("exit", () => {
            client.destroy()
            setStateSync("DOWN")
        })
    }
}

async function setState(status: State): Promise<void> {
    await writeFile("status", status, {encoding: "utf8"})
}

function setStateSync(status: State): void {
    writeFileSync("status", status, {encoding: "utf8"})
}

async function getState(): Promise<State> {
    try {
        return await readFile("status", "utf8") as State
    } catch (e) {
        return "RECREATE"
    }
}