import {
    ApplicationCommandType,
    Client,
    GatewayIntentBits,
    Partials,
    RESTPutAPIApplicationGuildCommandsJSONBody,
    RESTPutAPIApplicationGuildCommandsResult,
    Routes,
} from "discord.js"
import {MessageContextMenuCommands, RegisteredCommands, SlashCommands, UserContextMenuCommands} from "./commands"
import {REST} from "@discordjs/rest"
import {Handlers} from "./handlers"
import {Variables} from "./variables"
import {Config} from "./models/config"
import {NotionDatabase} from "./models/notionDatabase"
import {CommandNotFoundByNameError} from "./errors"

const client = new Client({
    intents: [GatewayIntentBits.GuildMembers],
    partials: [Partials.User, Partials.GuildMember],
})

const commandsBody: RESTPutAPIApplicationGuildCommandsJSONBody = []
SlashCommands.forEach(cw => {
    commandsBody.push(cw.toJSON())
    console.log(`Constructed command '${cw.builder.name}'`)
})

MessageContextMenuCommands.forEach(cw => {
    commandsBody.push(cw.toJSON())
    console.log(`Constructed command '${cw.builder.name}'`)
})

UserContextMenuCommands.forEach(cw => {
    commandsBody.push(cw.toJSON())
    console.log(`Constructed command '${cw.builder.name}'`)
})

const rest = new REST({version: "10"}).setToken(Variables.discordToken);

(async () => {
    await NotionDatabase.getDefault()

    const applicationCommands = await rest.put(Routes.applicationGuildCommands(Config.discordApplicationId,
        Config.guildId), {body: commandsBody}) as RESTPutAPIApplicationGuildCommandsResult
    console.log("Commands updated")

    // TODO
    for (const applicationCommand of applicationCommands) {
        switch (applicationCommand.type) {
        case ApplicationCommandType.ChatInput: {
            const wrapper = SlashCommands.find(command => command.builder.name === applicationCommand.name)
            if (!wrapper) {
                throw new CommandNotFoundByNameError(applicationCommand.name)
            }

            RegisteredCommands.set(applicationCommand.id, wrapper)
            break
        }
        case ApplicationCommandType.User:
            const command = UserContextMenuCommands.find(
                command => command.builder.name === applicationCommand.name)
            if (!command) {
                throw new CommandNotFoundByNameError(applicationCommand.name)
            }

            RegisteredCommands.set(applicationCommand.id, command)
            break
        case ApplicationCommandType.Message: {
            const wrapper = MessageContextMenuCommands.find(
                command => command.builder.name === applicationCommand.name)
            if (!wrapper) {
                throw new CommandNotFoundByNameError(applicationCommand.name)
            }

            RegisteredCommands.set(applicationCommand.id, wrapper)
            break
        }
        }
    }

    for (const handler of Handlers) {
        client.on(handler.event, async (...args) => {
            try {
                await handler.handle(...args)
            } catch (e) {
                console.error(e)
            }
        })
    }

    await client.login(Variables.discordToken)
})()