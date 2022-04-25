import {Config} from "../config"
import EmbedUtilities from "./embedUtilities"
import {
    ActionRowBuilder,
    Attachment,
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

export type NoteData = {
    author: User,
    target: GuildMember | User,
    title?: string,
    body: string,
    attachment?: Attachment,
    url: string,
    timestamp: DateTime,
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

        return this.addNotesButton({embeds: [embed]}, options.url)
    }

    static generateNoteResponse(options: NoteData): WebhookEditMessageOptions {
        const embed = EmbedUtilities.makeEmbed(`Note added to ${InteractionUtilities.getTag(options.target)}`)
        if (options.title) {
            embed.setTitle(options.title)
        }

        embed.setDescription(options.body)
        if (options.attachment) {
            embed.setImage(options.attachment.url)
        }

        embed.setFooter({text: `Added by ${options.author.tag}`})
        embed.setTimestamp(options.timestamp.toMillis())

        return this.addNotesButton({embeds: [embed]}, options.url)
    }

    static addNotesButton<Type extends WebhookEditMessageOptions | MessageOptions>(options: Type, url: string): Type {
        if (!options.components) {
            options.components = []
        }

        options.components.push(new ActionRowBuilder<MessageActionRowComponentBuilder>()
            .addComponents([
                new ButtonBuilder()
                    .setStyle(ButtonStyle.Link)
                    .setURL(url)
                    .setLabel("📝 View notes"),
            ]),
        )

        return options
    }
}