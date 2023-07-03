import { Discord, Prisma } from "./clients.mjs"
import {
  MessageContextMenuCommands,
  RegisteredCommands,
  SlashCommands,
  UserContextMenuCommands,
} from "./commands.mjs"
import { CommandNotFoundByNameError, logError } from "./errors.mjs"
import { Handlers } from "./handlers.mjs"
import { Config } from "./models/config.mjs"
import type { Command } from "./types/command.mjs"
import { testComparePenalty } from "./utilities/penaltyUtilities.mjs"
import { Variables } from "./variables.mjs"
import {
  Routes,
  type RESTPutAPIApplicationGuildCommandsJSONBody,
  type RESTPutAPIApplicationGuildCommandsResult,
  ApplicationCommandType,
} from "discord.js"

// TODO: make this run at compile time?
testComparePenalty()

const commandsBody: RESTPutAPIApplicationGuildCommandsJSONBody = []
for (const command of [
  ...SlashCommands,
  ...MessageContextMenuCommands,
  ...UserContextMenuCommands,
]) {
  commandsBody.push(command.builder.toJSON())
  console.log(`Constructed command '${command.builder.name}'`)
}

const guilds = await Prisma.warningGuild.findMany()
for (const guild of guilds) {
  const route =
    Variables.nodeEnv === "production"
      ? Routes.applicationCommands(Config.bot.applicationId)
      : Routes.applicationGuildCommands(Config.bot.applicationId, guild.id)

  const applicationCommands = (await Discord.rest.put(route, {
    body: commandsBody,
  })) as RESTPutAPIApplicationGuildCommandsResult
  console.log("Commands updated")
  for (const applicationCommand of applicationCommands) {
    let command: Command<ApplicationCommandType> | undefined
    switch (applicationCommand.type) {
      case ApplicationCommandType.ChatInput:
        command = SlashCommands.find(
          (command) => command.builder.name === applicationCommand.name
        )
        break
      case ApplicationCommandType.User:
        command = UserContextMenuCommands.find(
          (command) => command.builder.name === applicationCommand.name
        )
        break
      case ApplicationCommandType.Message:
        command = MessageContextMenuCommands.find(
          (command) => command.builder.name === applicationCommand.name
        )
        break
    }

    if (!command) {
      throw new CommandNotFoundByNameError(applicationCommand.name)
    }

    RegisteredCommands.set(applicationCommand.id, command)
  }

  if (Variables.nodeEnv === "production") {
    break
  }
}

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

await Discord.login(Variables.discordBotToken)
