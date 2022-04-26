import {Config} from "../config"
import {DateTime} from "luxon"
import {EmbedBuilder} from "discord.js"

export default class EmbedUtilities {
    static makeEmbed(authorName: string,
                     authorIcon = Config.successIcon,
                     title?: string,
                     description?: string): EmbedBuilder {
        return new EmbedBuilder()
            .setAuthor({
                name: authorName,
                iconURL: authorIcon,
            })
            .setTitle(title ?? null)
            .setDescription(description ?? null)
            .setTimestamp(DateTime.now().toMillis())
    }

    static append(embed: EmbedBuilder, content: string, separator = "\n\n"): EmbedBuilder {
        const last = embed.data.fields?.at(embed.data.fields.length - 1)
        if (!last) {
            return embed.setDescription(`${embed.data.description ?
                `${embed.data.description}${separator}` :
                ""}${content}`)
        }

        last.value = last.value === "..." ? content : `${last.value}${separator}${content}`
        return embed
    }
}