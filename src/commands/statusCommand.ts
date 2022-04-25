import ChatInputCommandWrapper from "../wrappers/chatInputCommandWrapper"
import {ChatInputCommandInteraction} from "discord.js"
import EmbedUtilities from "../utilities/embedUtilities"
import {DateTime, Duration} from "luxon"

/**
 * @description Slash command which displays the bot status.
 */
export default class StatusCommand extends ChatInputCommandWrapper {
    constructor() {
        super("status", "Display ping and uptime")
    }

    async execute(interaction: ChatInputCommandInteraction) {
        const since = DateTime.now().minus(Duration.fromDurationLike({seconds: process.uptime()})).toUnixInteger()
        const uptime = Duration.fromMillis(process.uptime() * 1000)
            .shiftTo("days", "hours", "minutes", "seconds")
            .normalize()

        const embed = EmbedUtilities.makeEmbed("Status", undefined)
            .addFields([{
                name: "Ping",
                value: `${interaction.client.ws.ping}ms`,
            }, {
                name: "Uptime",
                value: `Up since <t:${since}>\nUp for \`${uptime.toHuman({
                    listStyle: "long",
                    notation: "compact",
                    unitDisplay: "short",
                })}\``,
            }])

        await interaction.editReply({embeds: [embed]})
    }
}