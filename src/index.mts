import { SlashCommands } from "./commands.mjs"
import { ReRegisterCommand } from "./commands/reRegisterCommand.mjs"
import { reportError } from "./errors.mjs"
import { Handlers } from "./handlers.mjs"
import {
  Buttons,
  Modals,
  RegisteredButtons,
  RegisteredModals,
} from "./interactable.mjs"
import { Variables } from "./variables.mjs"
import { Client, GatewayIntentBits, Partials } from "discord.js"

for (const button of Buttons) {
  RegisteredButtons.set(button.name, button)
}

for (const modal of Modals) {
  RegisteredModals.set(modal.name, modal)
}

const client = new Client({
  intents: [
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.Guilds,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildBans,
  ],
  partials: [
    Partials.User,
    Partials.Channel,
    Partials.GuildMember,
    Partials.Message,
    Partials.Reaction,
    Partials.GuildScheduledEvent,
    Partials.ThreadMember,
  ],
})
client.rest.setToken(Variables.discordToken)

SlashCommands.push(new ReRegisterCommand())
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
