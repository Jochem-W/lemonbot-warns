import {ChatInputCommand} from "../models/chatInputCommand"
import {ChatInputCommandInteraction, PermissionFlagsBits, WebhookEditMessageOptions} from "discord.js"
import {DateTime, Duration} from "luxon"
import {ResponseBuilder} from "../utilities/responseBuilder"

type ResponseOptions = {
    ping: number
}

export class StatusCommand extends ChatInputCommand {
    public constructor() {
        super("status", "Display ping and uptime", PermissionFlagsBits.ModerateMembers)
    }

    public static buildResponse(options: ResponseOptions): WebhookEditMessageOptions {
        const since = DateTime.now().minus(Duration.fromDurationLike({seconds: process.uptime()})).toUnixInteger()
        const uptime = Duration.fromMillis(process.uptime() * 1000)
            .shiftTo("days", "hours", "minutes", "seconds")
            .normalize()

        return {
            embeds: [ResponseBuilder.makeEmbed("Status")
                .addFields([{
                    name: "Ping",
                    value: `${options.ping}ms`,
                }, {
                    name: "Uptime",
                    value: `Up since <t:${since}>\nUp for \`${uptime.toHuman({
                        listStyle: "long",
                        notation: "compact",
                        unitDisplay: "short",
                    })}\``,
                }])],
        }
    }

    public async handleCommandInteraction(interaction: ChatInputCommandInteraction): Promise<void> {
        await interaction.editReply(StatusCommand.buildResponse({ping: interaction.client.ws.ping}))
    }
}