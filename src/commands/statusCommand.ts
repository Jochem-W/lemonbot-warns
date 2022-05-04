import CommandConstructor from "../models/commandConstructor"
import ExecutableCommand from "../models/executableCommand"
import {ChatInputCommandInteraction, PermissionsBitField} from "discord.js"
import EmbedUtilities from "../utilities/embedUtilities"
import {DateTime, Duration} from "luxon"

export default class StatusCommand extends CommandConstructor<ChatInputCommandInteraction> {
    constructor() {
        super(ExecutableStatusCommand, "status", "Display ping and uptime", PermissionsBitField.Flags.ModerateMembers)
    }
}

class ExecutableStatusCommand extends ExecutableCommand<ChatInputCommandInteraction> {
    constructor(interaction: ChatInputCommandInteraction) {
        super(interaction)
    }

    async cleanup() {
    }

    async execute() {
        const since = DateTime.now().minus(Duration.fromDurationLike({seconds: process.uptime()})).toUnixInteger()
        const uptime = Duration.fromMillis(process.uptime() * 1000)
            .shiftTo("days", "hours", "minutes", "seconds")
            .normalize()

        const embed = EmbedUtilities.makeEmbed("Status")
            .addFields([{
                name: "Ping",
                value: `${this.interaction.client.ws.ping}ms`,
            }, {
                name: "Uptime",
                value: `Up since <t:${since}>\nUp for \`${uptime.toHuman({
                    listStyle: "long",
                    notation: "compact",
                    unitDisplay: "short",
                })}\``,
            }])

        await this.interaction.editReply({embeds: [embed]})
    }
}