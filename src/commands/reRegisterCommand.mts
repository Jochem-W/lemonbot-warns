import { Prisma } from "../clients.mjs"
import {
  MessageContextMenuCommands,
  RegisteredCommands,
  SlashCommands,
  UserContextMenuCommands,
} from "../commands.mjs"
import { CommandNotFoundByNameError } from "../errors.mjs"
import type { Command } from "../interfaces/command.mjs"
import { ChatInputCommand } from "../models/chatInputCommand.mjs"
import { DefaultConfig } from "../models/config.mjs"
import { ensureOwner } from "../utilities/discordUtilities.mjs"
import { makeEmbed } from "../utilities/embedUtilities.mjs"
import { Variables } from "../variables.mjs"
import { WarnCommand } from "./warnCommand.mjs"
import {
  ApplicationCommandType,
  ChatInputCommandInteraction,
  CommandInteraction,
  PermissionFlagsBits,
  REST,
  RESTPutAPIApplicationGuildCommandsJSONBody,
  RESTPutAPIApplicationGuildCommandsResult,
  Routes,
} from "discord.js"

export class ReRegisterCommand extends ChatInputCommand {
  public constructor() {
    super(
      "re-register",
      "Re-register all commands",
      PermissionFlagsBits.Administrator
    )
  }

  public static async register(rest: REST) {
    RegisteredCommands.clear()

    for (let i = 0; i < SlashCommands.length; i++) {
      if (SlashCommands[i] instanceof WarnCommand) {
        SlashCommands.splice(i, 1)
        i--
      }
    }

    SlashCommands.push(
      new WarnCommand(
        await Prisma.penalty.findMany(),
        await Prisma.reason.findMany()
      )
    )

    const commandsBody: RESTPutAPIApplicationGuildCommandsJSONBody = []
    for (const command of [
      ...SlashCommands,
      ...MessageContextMenuCommands,
      ...UserContextMenuCommands,
    ]) {
      commandsBody.push(command.toJSON())
      console.log(`Constructed command '${command.builder.name}'`)
    }

    const route =
      Variables.nodeEnvironment === "production"
        ? Routes.applicationCommands(DefaultConfig.bot.applicationId)
        : Routes.applicationGuildCommands(
            DefaultConfig.bot.applicationId,
            DefaultConfig.guild.id
          )

    const applicationCommands = (await rest.put(route, {
      body: commandsBody,
    })) as RESTPutAPIApplicationGuildCommandsResult
    console.log("Commands updated")
    for (const applicationCommand of applicationCommands) {
      let command: Command<CommandInteraction> | undefined
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
  }

  public async handle(interaction: ChatInputCommandInteraction) {
    await ensureOwner(interaction)

    await ReRegisterCommand.register(interaction.client.rest)
    await interaction.editReply({
      embeds: [
        makeEmbed("Commands re-registered", DefaultConfig.icons.success),
      ],
    })
  }
}
