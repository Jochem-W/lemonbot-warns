import CommandConstructor from "../models/commandConstructor"
import ExecutableCommand from "../models/executableCommand"
import {ChatInputCommandInteraction, inlineCode, PermissionsBitField, time} from "discord.js"
import {DateTime} from "luxon"
import EmbedUtilities from "../utilities/embedUtilities"

export default class CheckBansCommand extends CommandConstructor<ChatInputCommandInteraction> {
    constructor() {
        super(ExecutableCheckBansCommand, "check-bans", "Check banned users", PermissionsBitField.Flags.ModerateMembers)
    }
}

class ExecutableCheckBansCommand extends ExecutableCommand<ChatInputCommandInteraction> {
    constructor(interaction: ChatInputCommandInteraction) {
        super(interaction)
    }

    async execute() {
        if (!this.interaction.inGuild()) {
            throw new Error("This command can only be used in a server")
        }

        const embed = EmbedUtilities.makeEmbed("Wrongfully auto-banned users")
            .setDescription(
                "The following users were automatically banned for having an account less than 30 days old and are still banned despite now having an account older than 30 days:")
        for (const [, ban] of await this.interaction.guild!.bans.fetch()) {
            if (ban.reason !== "Account was less than 30 days old") {
                continue
            }

            const createdDate = DateTime.fromMillis(ban.user.createdTimestamp)
            if (DateTime.now().diff(createdDate).as("days") < 30) {
                continue
            }

            embed.data.description +=
                `• ${inlineCode(ban.user.tag)} (created ${time(Math.floor(createdDate.toSeconds()), "R")})\n`
        }

        await this.interaction.editReply({embeds: [embed]})
    }

    async cleanup() {
    }
}