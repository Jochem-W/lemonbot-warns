import Config, {Penalty} from "../config"
import EmbedUtilities from "./embedUtilities"
import {
    ActionRowBuilder,
    Attachment,
    bold,
    ButtonBuilder,
    ButtonStyle,
    channelMention,
    CommandInteraction,
    EmbedBuilder,
    GuildMember,
    inlineCode,
    italic,
    MessageActionRowComponentBuilder,
    MessageOptions,
    Snowflake,
    TextChannel,
    User,
    WebhookEditMessageOptions,
} from "discord.js"
import {DateTime, Duration} from "luxon"
import InteractionUtilities from "./interactionUtilities"
import {DatabaseEntry} from "./databaseUtilities"
import NotionUtilities from "./notionUtilities"
import {BlockObjectResponse} from "../types/notion"

export type WarnDmOptions = {
    guildName: string,
    description: string,
    images: string[],
    timestamp: DateTime,
}

export type WarnData = {
    recipient: GuildMember | User,
    warnedBy: User,
    description: string,
    reasons: string[],
    penalty: Penalty,
    timestamp: DateTime,
    images: string[],
    notified?: "DM" | TextChannel | false,
    url: string,
    penalised?: "applied" | "error" | "not_in_server" | "not_notified",
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
            .setFooter({text: "If you have any questions, please DM ModMail"})

        if (options.images.length <= 1) {
            if (options.images[0]) {
                embed.setImage(options.images[0])
            }

            return {embeds: [embed]}
        }

        const embeds = [embed]
        for (const image of options.images) {
            embeds.push(new EmbedBuilder().setImage(image).setColor("#ff0000"))
        }

        return {embeds: embeds}
    }

    static generateWarnResponse(options: WarnData, interaction?: CommandInteraction): WebhookEditMessageOptions {
        let administrationText = `• Reason: \`${options.reasons.join(", ")}\`\n• Penalty level: \`${options.penalty.name}\``
        if (options.notified === "DM") {
            administrationText += `\n• Notification: ${inlineCode("✅ (DM sent)")}`
        } else if (options.notified instanceof TextChannel) {
            administrationText +=
                `\n• Notification: ${inlineCode(`✅ (mentioned in`)} ${channelMention(options.notified.id)} ${inlineCode(
                    ")")}`
        } else if (options.notified === false) {
            administrationText += `\n• Notification: ${inlineCode("❌ (failed to DM or mention)")}`
        } else {
            administrationText += `\n• Notification: ${inlineCode("❌ (notify was False)")}`
        }

        switch (options.penalised) {
        case "applied":
            if (options.penalty.penalty instanceof Duration) {
                administrationText +=
                    `\n• Penalised: ${inlineCode(`✅ (timed out for ${options.penalty.penalty.toHuman()})`)}`
            } else if (options.penalty.penalty === "ban") {
                administrationText += `\n• Penalised: ${inlineCode("✅ (banned)")}`
            } else {
                administrationText += `\n• Penalised: ${inlineCode("❌ (penalty level has no penalty)")}`
            }

            break
        case "error":
            administrationText += `\n• Penalised: ${inlineCode("❌ (an error occurred)")}`
            break
        case "not_in_server":
            administrationText += `\n• Penalised: ${inlineCode("❌ (user not in server)")}`
            break
        case "not_notified":
            administrationText += `\n• Penalised: ${inlineCode("❌ (user wasn't notified)")}`
            break
        default:
            administrationText += `\n• Penalised: ${inlineCode("❓ (unknown)")}`
            break
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

        if (options.images.length <= 1) {
            if (options.images[0]) {
                embed.setImage(options.images[0])
            }

            return this.addNotesButton({embeds: [embed]}, options.url)
        }

        const embeds = [embed]
        for (const image of options.images) {
            embeds.push(new EmbedBuilder().setImage(image))
        }

        return this.addNotesButton({embeds: embeds}, options.url)
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
        embeds.at(-1)?.setFooter({text: "Last edited"}).setTimestamp(warningsData.entry.lastEditedTime.toMillis())

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