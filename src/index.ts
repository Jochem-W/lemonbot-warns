import {
    RESTPutAPIApplicationGuildCommandsJSONBody,
    RESTPutAPIApplicationGuildCommandsResult,
    Routes,
} from "discord-api-types/v10"
import {Client, IntentsBitField, Partials} from "discord.js"
import {ChatInputCommandConstructors, ChatInputCommands} from "./commands"
import {Variables} from "./variables"
import {Handlers} from "./handlers"
import {REST} from "@discordjs/rest"
import {Config} from "./config"
import DatabaseUtilities from "./utilities/databaseUtilities"

const client = new Client({
    intents: [IntentsBitField.Flags.GuildMembers],
    partials: [Partials.User, Partials.GuildMember],
})

const commandsBody: RESTPutAPIApplicationGuildCommandsJSONBody = []
ChatInputCommandConstructors.forEach(cw => {
    commandsBody.push(cw.build())
    console.log(`Constructed command '${cw.name}'`)
})

const rest = new REST({version: "10"}).setToken(Variables.discordToken);

(async () => {
    await DatabaseUtilities.initialiseCache()

    const applicationCommands = await rest.put(Routes.applicationGuildCommands(Variables.discordApplicationId,
        Config.guildId), {body: commandsBody}) as RESTPutAPIApplicationGuildCommandsResult
    console.log("Commands updated")

    for (const applicationCommand of applicationCommands) {
        // TODO: check command type and scope
        const wrapper = ChatInputCommandConstructors.find(cw => cw.name === applicationCommand.name)
        if (!wrapper) {
            throw new Error(`Command '${applicationCommand.name}' not found`)
        }

        ChatInputCommands.set(applicationCommand.id, wrapper)
    }

    Handlers.forEach(h => {
        client.on(h.eventName, async (...args) => {
            try {
                await h.handle(...args)
            } catch (e) {
                console.error("Unhandled error", e, "while handling an event using", h)
            }
        })
        console.log(`Registered '${h.constructor.name}' handler for '${h.eventName}'`)
    })

    await client.login(Variables.discordToken)
})()
