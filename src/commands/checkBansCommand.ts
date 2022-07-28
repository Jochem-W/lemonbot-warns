import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonInteraction,
    ButtonStyle,
    ChatInputCommandInteraction,
    inlineCode,
    MessageActionRowComponentBuilder,
    PermissionFlagsBits,
    time,
    WebhookEditMessageOptions,
} from "discord.js"
import {DateTime} from "luxon"
import {CustomId, InteractionScope} from "../models/customId"
import {ChatInputCommand} from "../models/chatInputCommand"
import {GuildOnlyError} from "../errors"
import {InteractionCollectorHelper} from "../models/interactionCollectorHelper"
import {makeEmbed} from "../utilities/responseBuilder"
import {fetchGuild} from "../utilities/interactionUtilities"

interface ResponseOptions {
    bans: string[]
    page: number
    pageLimit: number
}

export class CheckBansCommand extends ChatInputCommand {
    public constructor() {
        super("check-bans", "Check banned users", PermissionFlagsBits.ModerateMembers)
    }

    public static buildResponse(options: ResponseOptions): WebhookEditMessageOptions {
        const offset = options.page * options.pageLimit
        const lastPage = Math.ceil(options.bans.length / options.pageLimit) - 1

        return {
            embeds: [
                makeEmbed("Wrongfully auto-banned users")
                    .setTitle(
                        `The following ${options.bans.length.toString()} users were automatically banned for having an account less than 30 days old and are still banned despite now having an account older than 30 days.`)
                    .setDescription(options.bans.slice(offset, offset + options.pageLimit).join("\n") || null),
            ],
            components: [
                new ActionRowBuilder<MessageActionRowComponentBuilder>()
                    .setComponents([
                        new ButtonBuilder()
                            .setStyle(ButtonStyle.Primary)
                            .setCustomId(new CustomId(InteractionScope.Collector, "previous", "", []).toString())
                            .setDisabled(options.page === 0)
                            .setEmoji("⬅️"),
                        new ButtonBuilder()
                            .setStyle(ButtonStyle.Primary)
                            .setCustomId(new CustomId(InteractionScope.Collector, "next", "", []).toString())
                            .setDisabled(options.page >= lastPage)
                            .setEmoji("➡️"),
                    ]),
            ],
        }
    }

    public async handle(interaction: ChatInputCommandInteraction): Promise<void> {
        const guild = await fetchGuild(interaction)
        if (!guild) {
            throw new GuildOnlyError()
        }

        const bans: string[] = []
        for (const [, ban] of await guild.bans.fetch()) {
            if (ban.reason !== "Account was less than 30 days old") {
                continue
            }

            const createdDate = DateTime.fromMillis(ban.user.createdTimestamp)
            if (DateTime.now().diff(createdDate).as("days") < 30) {
                continue
            }

            bans.push(`• ${inlineCode(ban.user.tag)} (created ${time(Math.floor(createdDate.toSeconds()), "R")})`)
        }

        let page = 0

        const collector = await InteractionCollectorHelper.create(interaction)
        collector.addListener(async collected => {
            if (!(collected instanceof ButtonInteraction)) {
                console.error("Unhandled interaction", collected, "in collector for command", this)
                return
            }

            const customId = CustomId.fromString(collected.customId)
            switch (customId.primary) {
                case "next":
                    page++
                    break
                case "previous":
                    page--
                    break
            }

            await collected.update(CheckBansCommand.buildResponse({
                bans: bans,
                page: page,
                pageLimit: 25,
            }))
        })

        const response = CheckBansCommand.buildResponse({
            bans: bans,
            page: page,
            pageLimit: 25,
        })

        await interaction.editReply(response)
        collector.updateComponents(response.components)
    }
}