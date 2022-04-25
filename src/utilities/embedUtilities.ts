import {Config} from "../config"
import {DateTime} from "luxon"
import {EmbedBuilder} from "discord.js"

export default class EmbedUtilities {
    static makeEmbed(authorName: string, authorIcon = Config.successIcon, title?: string, description?: string) {
        return new EmbedBuilder()
            .setAuthor({
                name: authorName,
                iconURL: authorIcon,
            })
            .setTitle(title ?? null)
            .setDescription(description ?? null)
            .setTimestamp(DateTime.now().toMillis())
    }

    static append(embed: EmbedBuilder, content: string, separator = "\n\n") {
        if (!embed.data.fields?.length) {
            return embed.setDescription(`${embed.data.description ?
                `${embed.data.description}${separator}` :
                ""}${content}`)
        }

        const last = embed.data.fields[embed.data.fields.length - 1]
        last.value = last.value === "..." ? content : `${last.value}${separator}${content}`
        return embed
    }
}