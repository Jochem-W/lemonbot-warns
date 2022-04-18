import CommandWrapper from "../types/commandWrapper"
import {CommandInteraction} from "discord.js"
import Embed from "../utilities/embed"
import {Duration} from "luxon"

/**
 * @description Slash command which displays the bot status.
 */
export default class StatusCommand extends CommandWrapper {
    constructor() {
        super("status", "Display ping and uptime")
    }

    async execute(interaction: CommandInteraction) {
        const since = Math.floor((Date.now() - process.uptime()) / 1000)
        const uptime = Duration.fromMillis(process.uptime() * 1000)
            .shiftTo('days', 'hours', 'minutes', 'seconds')
            .normalize()

        const embed = Embed.make("Status", undefined)
            .addField("Ping", `${interaction.client.ws.ping}ms`)
            .addField("Uptime", `Up since <t:${since}>\nUp for \`${uptime.toHuman({
                listStyle: "long",
                notation: "compact",
                unitDisplay: "short"
            })}\``)

        await interaction.reply({
            embeds: [embed]
        })
    }
}