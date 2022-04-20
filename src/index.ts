import {REST} from "@discordjs/rest"
import {ApplicationCommand, Client, Intents} from "discord.js"

import {Handlers} from "./handlers"
import {Variables} from "./variables"
import {Commands} from "./commands"
import {RESTPutAPIGuildApplicationCommandsPermissionsJSONBody, Routes} from "discord-api-types/v10"
import {Config} from "./config";

const discord = new Client({
    intents: [Intents.FLAGS.GUILD_MEMBERS],
    partials: ["USER", "GUILD_MEMBER"]
})

Handlers.forEach(handler => {
    discord.on(handler.eventName, async (...args) => {
        await handler.handle(...args)
    })
})

const rest = new REST({version: "10"}).setToken(Variables.discordToken)

const commandsBody = Commands.map(command => {
    const json = command.toJSON()
    console.log(`Constructed command: ${json.name}`)
    return json
});

(async () => {
    const commands = await rest.put(Routes.applicationGuildCommands(Variables.discordApplicationId, Config.guildId), {body: commandsBody}) as ApplicationCommand[]
    const permissions: RESTPutAPIGuildApplicationCommandsPermissionsJSONBody = commands.map(command => {
        const wrapper = Commands.find(c => c.name === command.name)!
        return {
            id: command.id,
            ...wrapper.permissionsToJSON(),
        }
    })
    await rest.put(Routes.guildApplicationCommandsPermissions(Variables.discordApplicationId, Config.guildId), {body: permissions})
    await discord.login(Variables.discordToken)
})()