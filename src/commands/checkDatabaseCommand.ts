import SlashCommandConstructor from "../models/slashCommandConstructor"
import {
    ChatInputCommandInteraction,
    DiscordAPIError,
    GuildMember,
    PermissionFlagsBits,
    RESTJSONErrorCodes,
    User,
} from "discord.js"
import ExecutableCommand from "../models/executableCommand"
import DatabaseUtilities from "../utilities/databaseUtilities"
import Config from "../config"

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
        const discrepencies: [GuildMember | User, string][] = []

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
                    discrepencies.push([ban.user, `Should not be banned`])
                }

                continue
            } catch (e) {
                if (!(e instanceof DiscordAPIError) || e.code !== RESTJSONErrorCodes.UnknownBan) {
                    throw e
                }
            }

            try {
                const member = await guild.members.fetch(entry.id)
                if (penalty.penalty === "ban") {
                    discrepencies.push([member, `Should be banned`])
                }

                continue
            } catch (e) {
                if (!(e instanceof DiscordAPIError) || e.code !== RESTJSONErrorCodes.UnknownMember) {
                    throw e
                }

                discrepencies.push([await this.interaction.client.users.fetch(entry.id), `Should be in the server`])
            }
        }

        console.log(discrepencies)

        await this.interaction.editReply("Check the console!")
    }
}

