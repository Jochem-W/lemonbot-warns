import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle, codeBlock,
    EmbedBuilder,
    MessageActionRowComponentBuilder,
    MessageOptions,
    WebhookEditMessageOptions,
} from "discord.js"
import {DateTime} from "luxon"
import {DefaultConfig} from "../models/config"

export function makeEmbed(authorName: string,
                          authorIcon = DefaultConfig.icons.success,
                          title?: string,
                          description?: string): EmbedBuilder {
    return new EmbedBuilder()
        .setAuthor({
            name: authorName,
            iconURL: authorIcon.toString(),
        })
        .setTitle(title ?? null)
        .setDescription(description ?? null)
        .setTimestamp(DateTime.now().toMillis())
}

export function makeErrorEmbed(error: Error): EmbedBuilder {
    if (error.stack) {
        return makeEmbed("An unexpected error has occurred", DefaultConfig.icons.fail)
            .setDescription(codeBlock(error.stack))
            .setColor("#ff0000")
    }

    return makeEmbed(error.constructor.name, DefaultConfig.icons.fail)
        .setDescription(codeBlock(error.message))
        .setColor("#ff0000")
}

export function append(embed: EmbedBuilder, content: string, separator = "\n\n"): EmbedBuilder {
    const last = embed.data.fields?.at(embed.data.fields.length - 1)
    if (!last) {
        return embed.setDescription(`${embed.data.description ?
            `${embed.data.description}${separator}` :
            ""}${content}`)
    }

    last.value = last.value === "..." ? content : `${last.value}${separator}${content}`
    return embed
}

export function addNotesButton<T extends WebhookEditMessageOptions | MessageOptions>(options: T, url: string): T {
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
