import {MessageEmbed} from "discord.js"
import {Config} from "../config"
import {DateTime} from "luxon";

export default class Embed {
    static make(authorName?: string, authorIcon?: string, title?: string, description?: string) {
        return new MessageEmbed()
            .setAuthor({
                name: authorName ?? "",
                iconURL: authorIcon ?? Config.successIcon
            })
            .setTitle(title ?? "")
            .setDescription(description ?? "")
            .setTimestamp(DateTime.now().toMillis())
    }

    static append(embed: MessageEmbed, content: string) {
        if (!embed.fields.length) {
            return embed.setDescription(`${embed.description}\n\n${content}`)
        }

        const last = embed.fields[embed.fields.length - 1]
        last.value = last.value === "..." ? content : `${last.value}\n\n${content}`
        return embed
    }
}