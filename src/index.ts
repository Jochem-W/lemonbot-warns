import {
    RESTPutAPIApplicationGuildCommandsJSONBody,
    RESTPutAPIApplicationGuildCommandsResult,
    Routes,
} from "discord-api-types/v10"
import {ApplicationCommandType, Client, IntentsBitField, Partials} from "discord.js"
import {
    ChatInputCommandConstructors,
    Commands,
    MessageContextMenuCommandConstructors,
    UserContextMenuCommandConstructors,
} from "./commands"
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

MessageContextMenuCommandConstructors.forEach(cw => {
    commandsBody.push(cw.build())
    console.log(`Constructed command '${cw.name}'`)
})

UserContextMenuCommandConstructors.forEach(cw => {
    commandsBody.push(cw.build())
    console.log(`Constructed command '${cw.name}'`)
})

const rest = new REST({version: "10"}).setToken(Variables.discordToken);

(async () => {
    await rest.put(Routes.applicationCommands(Variables.discordApplicationId), {body: []})


    await DatabaseUtilities.initialiseCache()
    const applicationCommands = await rest.put(Routes.applicationGuildCommands(Variables.discordApplicationId,
        Config.guildId), {body: commandsBody}) as RESTPutAPIApplicationGuildCommandsResult
    console.log("Commands updated")

    // TODO
    for (const applicationCommand of applicationCommands) {
        switch (applicationCommand.type) {
        case ApplicationCommandType.ChatInput: {
            const wrapper = ChatInputCommandConstructors.find(cw => cw.name === applicationCommand.name)
            if (!wrapper) {
                throw new Error(`Command '${applicationCommand.name}' not found`)
            }

            Commands.set(applicationCommand.id, wrapper)
            break
        }
        case ApplicationCommandType.User:
            const wrapper = UserContextMenuCommandConstructors.find(cw => cw.name === applicationCommand.name)
            if (!wrapper) {
                throw new Error(`Command '${applicationCommand.name}' not found`)
            }

            Commands.set(applicationCommand.id, wrapper)
            break
        case ApplicationCommandType.Message: {
            const wrapper = MessageContextMenuCommandConstructors.find(cw => cw.name === applicationCommand.name)
            if (!wrapper) {
                throw new Error(`Command '${applicationCommand.name}' not found`)
            }

            Commands.set(applicationCommand.id, wrapper)
            break
        }
        default:
            throw new Error(`Unknown command type '${applicationCommand.type}'`)
        }
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
