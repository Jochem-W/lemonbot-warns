import {MessageEmbed} from "discord.js";
import {Config} from "../config";

export default class Embed {
    static make(authorName?: string, authorIcon?: string, title?: string, description?: string) {
        return new MessageEmbed()
            .setAuthor({
                name: authorName ?? "",
                iconURL: authorIcon ?? Config.authorIcon
            })
            .setTitle(title ?? "")
            .setDescription(description ?? "")
            .setTimestamp(Date.now())
    }
}