import SlashCommandConstructor from "../models/slashCommandConstructor"
import {
    ChatInputCommandInteraction,
    codeBlock,
    DiscordAPIError,
    PermissionFlagsBits,
    RESTJSONErrorCodes,
} from "discord.js"
import ExecutableCommand from "../models/executableCommand"
import DatabaseUtilities, {DatabaseEntry} from "../utilities/databaseUtilities"
import Config from "../config"
import InteractionUtilities from "../utilities/interactionUtilities"

export default class CheckDatabaseCommand extends SlashCommandConstructor<ChatInputCommandInteraction> {
    constructor() {
        super(ExecutableCheckDatabaseCommand,
            "check-database",
            "Check if database users are in the server and ban penalties are correct",
            PermissionFlagsBits.ModerateMembers)
    }
}

class ExecutableCheckDatabaseCommand extends ExecutableCommand<ChatInputCommandInteraction> {
    constructor(interaction: ChatInputCommandInteraction) {
        super(interaction)
    }

    async cleanup(): Promise<void> {
    }

    async execute(): Promise<void> {
        if (!await InteractionUtilities.checkOwner(this.interaction)) {
            throw new Error("You must be the bot owner to use this command")
        }

        const discrepancies: { entry: DatabaseEntry, error: string }[] = []

        if (!this.interaction.inGuild()) {
            throw new Error("This command can only be used in a guild")
        }

        const guild = this.interaction.guild ?? await this.interaction.client.guilds.fetch(this.interaction.guildId)
        for await (const entry of DatabaseUtilities.getEntries()) {
            const penalty = Config.penalties.find(p => p.name === entry.currentPenaltyLevel)
            if (!penalty) {
                throw new Error(`Unknown penalty level ${entry.currentPenaltyLevel}`)
            }

            try {
                const ban = await guild.bans.fetch(entry.id)
                // TODO
                if (ban.reason === "Account was less than 30 days old") {
                    continue
                }

                if (penalty.penalty !== "ban") {
                    discrepancies.push({entry: entry, error: `Should not be banned`})
                }

                continue
            } catch (e) {
                if (!(e instanceof DiscordAPIError) || e.code !== RESTJSONErrorCodes.UnknownBan) {
                    throw e
                }
            }

            try {
                await guild.members.fetch(entry.id)
                if (penalty.penalty === "ban") {
                    discrepancies.push({entry: entry, error: `Should be banned`})
                }
            } catch (e) {
                if (!(e instanceof DiscordAPIError) || e.code !== RESTJSONErrorCodes.UnknownMember) {
                    throw e
                }

                discrepancies.push({entry: entry, error: `Left the server`})
            }
        }

        await this.interaction.editReply(codeBlock(discrepancies.map(discrepancy => {
            return `User: ${discrepancy.entry.name} (${discrepancy.entry.id})\nPenalty: ${discrepancy.entry.currentPenaltyLevel}\nError: ${discrepancy.error}`
        }).join("\n\n")))
    }
}

