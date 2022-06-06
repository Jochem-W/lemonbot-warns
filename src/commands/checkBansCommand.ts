import SlashCommandConstructor from "../models/slashCommandConstructor"
import ExecutableCommand from "../models/executableCommand"
import {ChatInputCommandInteraction, inlineCode, PermissionFlagsBits, time} from "discord.js"
import {DateTime} from "luxon"
import EmbedUtilities from "../utilities/embedUtilities"

export default class CheckBansCommand extends SlashCommandConstructor<ChatInputCommandInteraction> {
    constructor() {
        super(ExecutableCheckBansCommand, "check-bans", "Check banned users", PermissionFlagsBits.ModerateMembers)
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

        let count = 0
        const embed = EmbedUtilities.makeEmbed("Wrongfully auto-banned users")
        let description = ""
        for (const [, ban] of await this.interaction.guild!.bans.fetch()) {
            if (ban.reason !== "Account was less than 30 days old") {
                continue
            }

            const createdDate = DateTime.fromMillis(ban.user.createdTimestamp)
            if (DateTime.now().diff(createdDate).as("days") < 30) {
                continue
            }

            description +=
                `\n• ${inlineCode(ban.user.tag)} (created ${time(Math.floor(createdDate.toSeconds()), "R")})`
            count++
        }

        description =
            `The following ${inlineCode(count.toString())} users were automatically banned for having an account less than 30 days old and are still banned despite now having an account older than 30 days:` +
            description

        embed.setDescription(description)

        await this.interaction.editReply({embeds: [embed]})
    }

    async cleanup() {
    }
}