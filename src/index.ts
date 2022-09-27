import {Client, GatewayIntentBits, Partials} from "discord.js"
import {Handlers} from "./handlers"
import {Variables} from "./variables"
import {reportError} from "./errors"
import {ReRegisterCommand} from "./commands/reRegisterCommand"

const client = new Client({
    intents: [GatewayIntentBits.GuildMembers],
    partials: [Partials.User, Partials.GuildMember],
})
client.rest.setToken(Variables.discordToken)

void (async () => {
    await ReRegisterCommand.register(client.rest)

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