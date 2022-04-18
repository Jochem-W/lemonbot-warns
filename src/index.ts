import {REST} from "@discordjs/rest"
import {Client} from "discord.js"

import {Handlers} from "./handlers"
import {Variables} from "./variables"
import {Commands} from "./commands"
import {Routes} from "discord-api-types/v10"

const discord = new Client({intents: []})

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
        await rest.put(Routes.applicationGuildCommands(Variables.discordApplicationId, Variables.guildId), {body: jsonCommands})
    } catch (error) {
        console.error(error)
    }

    await discord.login(Variables.discordToken)
})()