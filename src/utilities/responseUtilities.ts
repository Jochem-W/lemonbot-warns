import {Config} from "../config"
import EmbedUtilities from "./embedUtilities"
import {
    ActionRowBuilder,
    Attachment,
    bold,
    ButtonBuilder,
    ButtonStyle,
    CommandInteraction,
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

export type NotesButtonData = {
    commandId: Snowflake,
    ephemeral: boolean,
    sourceId: Snowflake,
    targetId: Snowflake,
}

export default class ResponseUtilities {
    static generateWarnDm(options: WarnDmOptions): MessageOptions {
        const embed = EmbedUtilities.makeEmbed(`You have been warned in ${options.guildName}`, Config.warnIcon)
            .setColor("#ff0000")
            .setDescription(`${bold("Reason")}: ${italic(options.description)}`)
            .setTimestamp(options.timestamp.toMillis())
            .setFooter({text: "If you have any questions or would like to submit an appeal, please DM ModMail."})

        if (options.image) {
            embed.setImage(options.image)
        }

        return {embeds: [embed]}
    }

    static generateWarnResponse(options: WarnData, interaction?: CommandInteraction): WebhookEditMessageOptions {
        let administrationText = `• Reason: \`${options.reason}\`\n• Penalty level: \`${options.penalty}\``
        if (options.notified === true) {
            administrationText += `\n• DM sent: ${inlineCode("✅")}`
        } else if (options.notified === false) {
            administrationText += `\n• DM sent: ${inlineCode("❌ (DMs disabled/bot blocked)")}`
        } else {
            administrationText += `\n• DM sent: ${inlineCode("❌ (notify was False)")}`
        }

        const recipientAvatar = (options.recipient instanceof GuildMember ?
            options.recipient.user :
            options.recipient).displayAvatarURL({size: 4096})
        const embed = EmbedUtilities.makeEmbed(`Warned ${InteractionUtilities.getTag(options.recipient)}`,
            recipientAvatar)
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
            .setFooter({
                text: `Warned by ${options.warnedBy.tag}`,
                iconURL: options.warnedBy.displayAvatarURL({size: 4096}),
            })
            .setTimestamp(options.timestamp.toMillis())

        if (options.image) {
            embed.setImage(options.image)
        }

        return this.addNotesButton({embeds: [embed]}, options.url)
        // return this.addNotesButton({embeds: [embed]}, options.url, interaction ? {
        //     commandId: ChatInputCommands.findKey(command => command.name === "notes")!,
        //     ephemeral: interaction.ephemeral ?? false,
        //     sourceId: options.warnedBy.id,
        //     targetId: options.recipient.id,
        // } : undefined)
    }

    static generateNoteResponse(options: NoteData, interaction?: CommandInteraction): WebhookEditMessageOptions {
        const targetAvatar = (options.target instanceof GuildMember ?
            options.target.user :
            options.target).displayAvatarURL({size: 4096})
        const embed = EmbedUtilities.makeEmbed(`Note added to ${InteractionUtilities.getTag(options.target)}`,
            targetAvatar)
        if (options.title) {
            embed.setTitle(options.title)
        }

        embed.setDescription(options.body)
        if (options.attachment) {
            embed.setImage(options.attachment.url)
        }

        embed.setFooter({
            text: `Added by ${options.author.tag}`,
            iconURL: options.author.displayAvatarURL({size: 4096}),
        })
        embed.setTimestamp(options.timestamp.toMillis())

        return this.addNotesButton({embeds: [embed]}, options.url)
        // return this.addNotesButton({embeds: [embed]}, options.url, interaction ? {
        //     commandId: ChatInputCommands.findKey(command => command.name === "notes")!,
        //     ephemeral: interaction.ephemeral ?? false,
        //     sourceId: options.author.id,
        //     targetId: options.target.id,
        // } : undefined)
    }

    static generateWarningsResponse(warningsData: WarningsData,
                                    notesData: NotesData,
                                    interaction?: CommandInteraction): WebhookEditMessageOptions {
        const embed = EmbedUtilities.makeEmbed(`Warnings for ${warningsData.user.tag}`,
            warningsData.user.displayAvatarURL({size: 4096}))
        if (!warningsData.entry) {
            embed.setTitle("This user isn't in the database")
            return {embeds: [embed]}
        }

        const parseResult = NotionUtilities.parseBlockObjects(notesData.blocks)
        if (parseResult.unsupportedBlocks) {
            const noun = parseResult.unsupportedBlocks === 1 ? "block is" : "blocks are"
            embed.setDescription(`• ${parseResult.unsupportedBlocks} ${noun} not supported and can only be viewed on Notion`)
        }

        embed.addFields([{
            name: "Current penalty level",
            value: warningsData.entry.currentPenaltyLevel,
        }, {
            name: "Reasons",
            value: warningsData.entry.reasons.length ?
                warningsData.entry.reasons.map(reason => ` - ${reason}`).join("\n") :
                "N/A",
        }, {
            name: "Watch",
            value: inlineCode(`${warningsData.entry.watchlist ? "✅" : "❌"}`),
        }])

        embed.setFooter(null)
            .setTimestamp(null)

        const embeds = [embed, ...parseResult.embeds]
        embeds.at(-1)!
            .setFooter({text: "Last edited"})
            .setTimestamp(warningsData.entry.lastEditedTime.toMillis())

        return {embeds: embeds}
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
                    .setLabel("📝 View notes (Notion)"),
            ]),
        )

        return options
    }
}