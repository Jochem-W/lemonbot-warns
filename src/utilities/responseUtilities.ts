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
    Snowflake,
    User,
    WebhookEditMessageOptions,
} from "discord.js"
import {DateTime} from "luxon"
import InteractionUtilities from "./interactionUtilities"
import {DatabaseEntry} from "./databaseUtilities"
import NotionUtilities from "./notionUtilities"
import {BlockObjectResponse} from "../types/notion"

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

export type NotesData = {
    user: User,
    blocks: BlockObjectResponse[],
    entry?: DatabaseEntry,
}

export type WarningsData = {
    user: User,
    entry?: DatabaseEntry,
    requester: User,
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

        return this.addNotesButton({embeds: [embed]}, options.url, options.warnedBy.id, options.recipient.id)
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

        return this.addNotesButton({embeds: [embed]}, options.url, options.author.id, options.target.id)
    }

    static generateNotesResponse(options: NotesData): WebhookEditMessageOptions {
        const embed = EmbedUtilities.makeEmbed(`Notes for ${options.user.tag}`,
            options.user.displayAvatarURL({size: 4096}))
        if (!options.entry) {
            embed.setTitle("This user isn't in the database")
            return {embeds: [embed]}
        }

        embed.setFooter({text: "Last edited"})
            .setTimestamp(options.entry.lastEditedTime.toMillis())

        const parseResult = NotionUtilities.parseBlockObjects(options.blocks)
        if (parseResult.unsupportedBlocks) {
            const noun = parseResult.unsupportedBlocks === 1 ? "block is" : "blocks are"
            EmbedUtilities.append(embed,
                `• ${parseResult.unsupportedBlocks} ${noun} not supported and can only be viewed on Notion`,
                "\n")
        }

        if (parseResult.fields.length > 25) {
            EmbedUtilities.append(embed, `• Displaying the first 25 of ${parseResult.fields.length} notes`, "\n")
        }

        embed.addFields(parseResult.fields.slice(0, 25))

        if (!embed.data.fields?.length && !embed.data.description) {
            embed.setTitle("This user has no notes")
        }

        return this.addNotesButton({embeds: [embed]}, options.entry.url)
    }

    static generateWarningsResponse(options: WarningsData): WebhookEditMessageOptions {
        const embed = EmbedUtilities.makeEmbed(`Warnings for ${options.user.tag}`,
            options.user.displayAvatarURL({size: 4096}))
        if (!options.entry) {
            embed.setTitle("This user isn't in the database")
            return {embeds: [embed]}
        }

        embed.addFields([{
            name: "Current penalty level",
            value: options.entry.currentPenaltyLevel,
        }, {
            name: "Reasons",
            value: options.entry.reasons.length ?
                options.entry.reasons.map(reason => ` - ${reason}`).join("\n") :
                "N/A",
        }])
            .setFooter({text: "Last edited"})
            .setTimestamp(options.entry.lastEditedTime.toMillis())

        return this.addNotesButton({embeds: [embed]}, options.entry.url, options.requester.id, options.user.id)
    }

    static addNotesButton<Type extends WebhookEditMessageOptions | MessageOptions>(options: Type,
                                                                                   url: string,
                                                                                   sourceId?: Snowflake,
                                                                                   targetId?: Snowflake): Type {
        if (!(sourceId && targetId || !sourceId && !targetId)) {
            throw new Error("Both sourceId and targetId must be provided")
        }

        if (!options.components) {
            options.components = []
        }

        const actionRow = new ActionRowBuilder<MessageActionRowComponentBuilder>()
        if (targetId && sourceId) {
            actionRow.addComponents([
                new ButtonBuilder()
                    .setStyle(ButtonStyle.Primary)
                    .setLabel("📝 View notes (Discord)")
                    .setCustomId(`notes:${sourceId}:${targetId}`),
            ])
        }

        actionRow.addComponents([
            new ButtonBuilder()
                .setStyle(ButtonStyle.Link)
                .setURL(url)
                .setLabel("📝 View notes (Notion)"),
        ])

        options.components.push(actionRow)

        return options
    }
}