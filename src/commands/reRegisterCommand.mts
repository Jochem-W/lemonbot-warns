import { Discord, Prisma } from "../clients.mjs"
import {
  MessageContextMenuCommands,
  RegisteredCommands,
  SlashCommands,
  UserContextMenuCommands,
} from "../commands.mjs"
import { CommandNotFoundByNameError } from "../errors.mjs"
import { ChatInputCommand } from "../models/chatInputCommand.mjs"
import { Config } from "../models/config.mjs"
import type { Command } from "../types/command.mjs"
import { ensureOwner } from "../utilities/discordUtilities.mjs"
import { Variables } from "../variables.mjs"
import { WarnCommand } from "./warnCommand.mjs"
import {
  ApplicationCommandType,
  ChatInputCommandInteraction,
  CommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  Routes,
} from "discord.js"
import type {
  RESTPutAPIApplicationGuildCommandsJSONBody,
  RESTPutAPIApplicationGuildCommandsResult,
} from "discord.js"

export class ReRegisterCommand extends ChatInputCommand {
  public constructor() {
    super(
      "re-register",
      "Re-register all commands",
      PermissionFlagsBits.Administrator
    )
  }

  public static async register() {
    RegisteredCommands.clear()

    for (let i = 0; i < SlashCommands.length; i++) {
      if (SlashCommands[i] instanceof WarnCommand) {
        SlashCommands.splice(i, 1)
        i--
      }
    }

    SlashCommands.push(
      new WarnCommand(
        await Prisma.reason.findMany(),
        await Prisma.penalty.findMany({ where: { hidden: false } })
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
  }

  public async handle(interaction: ChatInputCommandInteraction) {
    await ensureOwner(interaction)
    await interaction.deferReply({ ephemeral: true })

    await ReRegisterCommand.register()
    await interaction.editReply({
      embeds: [new EmbedBuilder().setTitle("Commands re-registered")],
    })
  }
}
