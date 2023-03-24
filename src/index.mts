import { Discord } from "./clients.mjs"
import { SlashCommands } from "./commands.mjs"
import { ReRegisterCommand } from "./commands/reRegisterCommand.mjs"
import { reportError } from "./errors.mjs"
import { Handlers } from "./handlers.mjs"
import { testComparePenalty } from "./utilities/penaltyUtilities.mjs"
import { Variables } from "./variables.mjs"

// TODO: make this run at compile time?
testComparePenalty()

SlashCommands.push(new ReRegisterCommand())
await ReRegisterCommand.register()

for (const handler of Handlers) {
  if (handler.once) {
    Discord.once(handler.event, async (...args) => {
      try {
        await handler.handle(...args)
      } catch (e) {
        if (!(e instanceof Error)) {
          throw e
        }

        await reportError(e)
      }
    })
    continue
  }

  Discord.on(handler.event, async (...args) => {
    try {
      await handler.handle(...args)
    } catch (e) {
      if (!(e instanceof Error)) {
        throw e
      }

      await reportError(e)
    }
  })
}

await Discord.login(Variables.discordToken)
