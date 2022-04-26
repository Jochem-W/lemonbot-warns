import {REST} from "@discordjs/rest"
import {Variables} from "./variables"
import {Commands, CommandWrappers} from "./commands"
import {
    RESTPutAPIApplicationGuildCommandsJSONBody,
    RESTPutAPIApplicationGuildCommandsResult,
    RESTPutAPIGuildApplicationCommandsPermissionsJSONBody,
    Routes,
} from "discord-api-types/v10"
import {Config} from "./config"
import {Client, IntentsBitField, Partials} from "discord.js"
import {Handlers} from "./handlers"

const client = new Client({
    intents: [IntentsBitField.Flags.GuildMembers],
    partials: [Partials.User, Partials.GuildMember],
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
    console.log("Commands updated")

    for (const applicationCommand of applicationCommands) {
        // TODO: check command type and scope
        const wrapper = CommandWrappers.find(cw => cw.name === applicationCommand.name)
        if (!wrapper) {
            throw new Error(`Command '${applicationCommand.name}' not found`)
        }

        Commands.set(applicationCommand.id, wrapper)
    }

    const permissionsBody: RESTPutAPIGuildApplicationCommandsPermissionsJSONBody = Commands.map((c, id) => {
        return {
            id: id,
            permissions: c.permissionsToJSON(),
        }
    })
    await rest.put(Routes.guildApplicationCommandsPermissions(Variables.discordApplicationId, Config.guildId),
        {body: permissionsBody})
    console.log("Permissions updated")

    Handlers.forEach(h => {
        client.on(h.eventName, async (...args) => await h.handle(...args))
        console.log(`Registered '${h.constructor.name}' handler for '${h.eventName}'`)
    })

    await client.login(Variables.discordToken)
})()
