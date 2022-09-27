import {
    ApplicationCommandType,
    Client,
    CommandInteraction,
    GatewayIntentBits,
    Partials,
    RESTPutAPIApplicationGuildCommandsJSONBody,
    RESTPutAPIApplicationGuildCommandsResult,
    Routes,
} from "discord.js"
import {MessageContextMenuCommands, RegisteredCommands, SlashCommands, UserContextMenuCommands} from "./commands"
import {Handlers} from "./handlers"
import {Variables} from "./variables"
import {DefaultConfig} from "./models/config"
import {CommandNotFoundByNameError, reportError} from "./errors"
import {Command} from "./interfaces/command"
import {WarnCommand} from "./commands/warnCommand"
import {Prisma} from "./clients"

const client = new Client({
    intents: [GatewayIntentBits.GuildMembers],
    partials: [Partials.User, Partials.GuildMember],
})
client.rest.setToken(Variables.discordToken)

void (async () => {
    SlashCommands.push(new WarnCommand(await Prisma.penalty.findMany(), await Prisma.reason.findMany()))

    const commandsBody: RESTPutAPIApplicationGuildCommandsJSONBody = []
    for (const command of [...SlashCommands, ...MessageContextMenuCommands, ...UserContextMenuCommands]) {
        commandsBody.push(command.toJSON())
        console.log(`Constructed command '${command.builder.name}'`)
    }

    const applicationCommands = await client.rest.put(Routes.applicationGuildCommands(DefaultConfig.bot.applicationId,
        DefaultConfig.guild.id), {body: commandsBody}) as RESTPutAPIApplicationGuildCommandsResult
    console.log("Commands updated")

    for (const applicationCommand of applicationCommands) {
        let command: Command<CommandInteraction> | undefined
        switch (applicationCommand.type) {
            case ApplicationCommandType.ChatInput:
                command = SlashCommands.find(command => command.builder.name === applicationCommand.name)
                break
            case ApplicationCommandType.User:
                command = UserContextMenuCommands.find(command => command.builder.name === applicationCommand.name)
                break
            case ApplicationCommandType.Message:
                command = MessageContextMenuCommands.find(command => command.builder.name === applicationCommand.name)
                break
        }

        if (!command) {
            throw new CommandNotFoundByNameError(applicationCommand.name)
        }

        RegisteredCommands.set(applicationCommand.id, command)
    }

    for (const handler of Handlers) {
        if (handler.once) {
            client.once(handler.event, async (...args) => {
                try {
                    await handler.handle(...args)
                } catch (e) {
                    if (!(e instanceof Error)) {
                        throw e
                    }

                    await reportError(client, e)
                }
            })
            continue
        }

        client.on(handler.event, async (...args) => {
            try {
                await handler.handle(...args)
            } catch (e) {
                if (!(e instanceof Error)) {
                    throw e
                }

                await reportError(client, e)
            }
        })
    }

    await client.login(Variables.discordToken)
})()