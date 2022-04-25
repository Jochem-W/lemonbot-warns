import {Config} from "../config"
import EmbedUtilities from "./embedUtilities"
import {
    ActionRowBuilder,
    bold,
    ButtonBuilder,
    ButtonStyle,
    GuildMember,
    inlineCode,
    italic,
    MessageActionRowComponentBuilder,
    MessageOptions,
    User,
    WebhookEditMessageOptions,
} from "discord.js"
import {DateTime} from "luxon"
import InteractionUtilities from "./interactionUtilities"

export type WarnDmOptions = {
    guildName: string,
    description: string,
    image?: string,
    timestamp: DateTime,
}

export type WarnData = {
    recipient: GuildMember | User,
    warnedBy: User,
    description: string,
    reason: string,
    penalty: string,
    timestamp: DateTime,
    image?: string,
    notified?: boolean,
    url: string,
}

export default class ResponseUtilities {
    static generateWarnDm(options: WarnDmOptions): MessageOptions {
        const embed = EmbedUtilities.makeEmbed(`You have been warned in ${options.guildName}`, Config.warnIcon)
            .setColor("#ff0000")
            .setDescription(`${bold("Reason")}: ${italic(options.description)}`)
            .setTimestamp(options.timestamp.toMillis())
            .setFooter({text: "If you have any questions, please contact a staff member"})

        if (options.image) {
            embed.setImage(options.image)
        }

        return {embeds: [embed]}
    }

    static generateWarnResponse(options: WarnData & { url: string }): WebhookEditMessageOptions {
        let administrationText = `• Reason: \`${options.reason}\`\n• Penalty level: \`${options.penalty}\``
        if (options.notified === true) {
            administrationText += `\n• DM sent: ${inlineCode("✅")}`
        } else if (options.notified === false) {
            administrationText += `\n• DM sent: ${inlineCode("❌ (failed)")}`
        } else {
            administrationText += `\n• DM sent: ${inlineCode("❌ (notify was False)")}`
        }

        const embed = EmbedUtilities.makeEmbed(`Warned ${InteractionUtilities.getTag(options.recipient)}`)
            .addFields([
                {
                    name: "Description",
                    value: options.description,
                },
                {
                    name: "Administration",
                    value: administrationText,
                },
            ])
            .setFooter({text: `Warned by ${options.warnedBy.tag}`})
            .setTimestamp(options.timestamp.toMillis())

        if (options.image) {
            embed.setImage(options.image)
        }

        return {
            embeds: [embed],
            components: [
                new ActionRowBuilder<MessageActionRowComponentBuilder>()
                    .addComponents([
                        new ButtonBuilder()
                            .setStyle(ButtonStyle.Link)
                            .setURL(options.url)
                            .setLabel("📝 View notes"),
                    ]),
            ],
        }
    }
}