import SlashCommandConstructor from "../models/slashCommandConstructor"
import {
    AttachmentBuilder,
    ChatInputCommandInteraction,
    DiscordAPIError,
    GuildMember,
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

        const discrepancies: { entry: Partial<DatabaseEntry>, error: string }[] = []

        if (!this.interaction.inGuild()) {
            throw new Error("This command can only be used in a guild")
        }

        const guild = this.interaction.guild ?? await this.interaction.client.guilds.fetch(this.interaction.guildId)
        const bans = await guild.bans.fetch()
        const entries: DatabaseEntry[] = []
        for await (const entry of DatabaseUtilities.getEntries()) {
            entries.push(entry)
        }

        for (const entry of entries) {
            const penalty = Config.penalties.find(p => p.name === entry.currentPenaltyLevel)
            if (!penalty) {
                throw new Error(`Unknown penalty level ${entry.currentPenaltyLevel}`)
            }

            const ban = bans.get(entry.id)
            if (penalty.penalty === "ban" && !ban) {
                discrepancies.push({entry, error: "Has a penalty with ban in the database, but isn't banned"})
                continue
            }

            if (ban && penalty.penalty !== "ban") {
                discrepancies.push({entry, error: "Is banned, but has a penalty with no ban in the database"})
                continue
            }

            let member: GuildMember | undefined
            try {
                member = await guild.members.fetch(entry.id)
            } catch (e) {
                if (!(e instanceof DiscordAPIError) || e.code !== RESTJSONErrorCodes.UnknownMember) {
                    throw e
                }
            }

            if (!ban && !member) {
                discrepancies.push({entry, error: "Member is in the database, but not in the serve"})
            }
        }

        for (const [_, ban] of bans) {
            const entry = entries.find(e => e.id === ban.user.id)
            if (entry) {
                continue
            }

            discrepancies.push({
                entry: {
                    id: ban.user.id,
                    name: ban.user.username,
                }, error: "Member is banned, but not in the database",
            })
        }

        await this.interaction.editReply({
            files: [new AttachmentBuilder(Buffer.from(JSON.stringify(discrepancies, null, 4)),
                {name: "discrepancies.json"})],
        })
    }
}

