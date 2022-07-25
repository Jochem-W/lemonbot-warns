import {ChatInputCommand} from "../models/chatInputCommand"
import {ChatInputCommandInteraction, PermissionFlagsBits, WebhookEditMessageOptions} from "discord.js"
import {Duration} from "luxon"
import {ResponseBuilder} from "../utilities/responseBuilder"
import {Variables} from "../variables"

interface ResponseOptions {
    ping: number
}

export class StatusCommand extends ChatInputCommand {
    public constructor() {
        super("status", "Display ping and uptime", PermissionFlagsBits.ModerateMembers)
    }

    public static buildResponse(options: ResponseOptions): WebhookEditMessageOptions {
        const uptime = Duration.fromMillis(process.uptime() * 1000)
            .shiftTo("days", "hours", "minutes", "seconds")
            .normalize()

        return {
            embeds: [ResponseBuilder.makeEmbed("Status")
                .addFields({
                    name: "Ping",
                    value: `${options.ping}ms`,
                }, {
                    name: "Uptime",
                    value: `Up for \`${uptime.toHuman({
                        listStyle: "long",
                        notation: "compact",
                        unitDisplay: "short",
                    })}\``,
                }, {
                    name: "Version",
                    value: Variables.commitHash ?? "unknown",
                })],
        }
    }

    public async handle(interaction: ChatInputCommandInteraction): Promise<void> {
        await interaction.editReply(StatusCommand.buildResponse({ping: interaction.client.ws.ping}))
    }
}