import {REST} from "@discordjs/rest"
import {Client, Intents} from "discord.js"

import {Handlers} from "./handlers"
import {Variables} from "./variables"
import {Commands} from "./commands"
import {Routes} from "discord-api-types/v10"
import {Config} from "./config"

const discord = new Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
        Intents.FLAGS.GUILD_PRESENCES
    ],
    partials: ["MESSAGE", "CHANNEL", "REACTION"]
})

Handlers.forEach(handler => {
    discord.on(handler.eventName, async (...args: any[]) => {
        await handler.handle(args)
    })
})

const rest = new REST({version: "10"}).setToken(Variables.discordToken)
const jsonCommands = Commands.map(command => {
    const json = command.json()
    console.log(`Constructed command: ${json.name}`)
    return json
});

(async () => {
    try {
        for (const guildId of Config.guildIds) {
            await rest.put(Routes.applicationGuildCommands(Variables.discordApplicationId, guildId), {body: jsonCommands})
        }
    } catch (error) {
        console.error(error)
    }

    await discord.login(Variables.discordToken)
})()