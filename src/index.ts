import {REST} from "@discordjs/rest"
import {Variables} from "./variables"
import {CommandWrappers} from "./commands"
import {
    RESTPutAPIApplicationGuildCommandsJSONBody,
    RESTPutAPIApplicationGuildCommandsResult,
    RESTPutAPIGuildApplicationCommandsPermissionsJSONBody,
    Routes,
} from "discord-api-types/v10"
import {Config} from "./config"
import {Client, Collection, Intents} from "discord.js"
import CommandHandler from "./handlers/commandHandler"
import {Handlers} from "./handlers"

const client = new Client({
    intents: [Intents.FLAGS.GUILD_MEMBERS],
    partials: ["USER", "GUILD_MEMBER"],
})

const commandsBody: RESTPutAPIApplicationGuildCommandsJSONBody = []
CommandWrappers.forEach(cw => {
    commandsBody.push(cw.toJSON())
    console.log(`Constructed command '${cw.name}'`)
})

const rest = new REST({version: "10"}).setToken(Variables.discordToken);

(async () => {
    const applicationCommands = await rest.put(Routes.applicationGuildCommands(Variables.discordApplicationId,
        Config.guildId), {body: commandsBody}) as RESTPutAPIApplicationGuildCommandsResult
    const permissionsBody: RESTPutAPIGuildApplicationCommandsPermissionsJSONBody = applicationCommands.map(c => {
        return {
            id: c.id,
            permissions: CommandWrappers.find(cw => cw.name === c.name)!.permissionsToJSON(),
        }
    })
    await rest.put(Routes.guildApplicationCommandsPermissions(Variables.discordApplicationId, Config.guildId),
        {body: permissionsBody})

    const result = new Collection(CommandWrappers.map(cw => {
        return [applicationCommands.find(c => c.name === cw.name)!.id, cw.execute]
    }))

    Handlers.push(new CommandHandler(result))

    Handlers.forEach(h => {
        client.on(h.eventName, async (...args) => await h.handle(...args))
        console.log(`Registered '${h.constructor.name}' handler for '${h.eventName}'`)
    })

    await client.login(Variables.discordToken)
})()
