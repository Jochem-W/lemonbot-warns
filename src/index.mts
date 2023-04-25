import { Discord, Forms } from "./clients.mjs"
import { SlashCommands } from "./commands.mjs"
import { ReRegisterCommand } from "./commands/reRegisterCommand.mjs"
import { logError } from "./errors.mjs"
import { Handlers } from "./handlers.mjs"
import { DefaultConfig } from "./models/config.mjs"
import { testComparePenalty } from "./utilities/penaltyUtilities.mjs"
import { testCompareReason } from "./utilities/reasonUtilities.mjs"
import { Variables } from "./variables.mjs"

// TODO: make this run at compile time?
testComparePenalty()
testCompareReason()

console.log(await Forms.forms.get({ formId: DefaultConfig.banAppealForm.id }))

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

        await logError(e)
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

      await logError(e)
    }
  })
}

await Discord.login(Variables.discordToken)
