import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    MessageActionRowComponentBuilder,
    MessageEditOptions,
    MessageOptions,
    WebhookEditMessageOptions,
} from "discord.js"
import {DateTime} from "luxon"
import {Config} from "../models/config"

export abstract class ResponseBuilder {
    public static makeEmbed(authorName: string,
                            authorIcon = Config.successIcon,
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

    public static makeErrorEmbed(error: Error): EmbedBuilder {
        return ResponseBuilder.makeEmbed("An error has occurred", Config.failIcon, error.message)
            .setColor("#ff0000")
            .setFooter({text: error.constructor.name})
    }

    public static append(embed: EmbedBuilder, content: string, separator = "\n\n"): EmbedBuilder {
        const last = embed.data.fields?.at(embed.data.fields.length - 1)
        if (!last) {
            return embed.setDescription(`${embed.data.description ?
                `${embed.data.description}${separator}` :
                ""}${content}`)
        }

        last.value = last.value === "..." ? content : `${last.value}${separator}${content}`
        return embed
    }

    public static disable<T extends WebhookEditMessageOptions | MessageEditOptions>(message: T): T {
        return {
            ...message,
            components: message.components?.map(row => {
                let builder: ActionRowBuilder<MessageActionRowComponentBuilder>
                if ("toJSON" in row) {
                    builder = new ActionRowBuilder<MessageActionRowComponentBuilder>(row.toJSON())
                } else {
                    builder = new ActionRowBuilder<MessageActionRowComponentBuilder>(row)
                }

                builder.components.map(component => component.setDisabled(true))

                return builder.toJSON()
            }),
        }
    }

    public static addNotesButton<T extends WebhookEditMessageOptions | MessageOptions>(options: T, url: string): T {
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