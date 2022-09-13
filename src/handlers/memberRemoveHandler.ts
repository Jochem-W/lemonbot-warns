import {Handler} from "../interfaces/handler"
import {ChannelType, GuildMember, PartialGuildMember} from "discord.js"
import {NotionDatabase} from "../models/notionDatabase"
import {ChannelNotFoundError, InvalidChannelTypeError, PageNotFoundError} from "../errors"
import {formatName} from "../utilities/notionUtilities"
import {DefaultConfig} from "../models/config"

export class MemberRemoveHandler implements Handler<"guildMemberRemove"> {
    public readonly event = "guildMemberRemove"
    public readonly once = false

    public async handle(member: GuildMember | PartialGuildMember): Promise<void> {
        const user = await member.client.users.fetch(member.id)
        const database = await NotionDatabase.getDefault()
        try {
            const entry = await database.update(user, {name: formatName(user)})
            console.log(`Changed ${user.id}'s name to '${entry.name}'`)
        } catch (e) {
            if (!(e instanceof PageNotFoundError)) {
                throw e
            }

            return
        }

        const warnCategory = await member.client.channels.fetch(DefaultConfig.guild.warnCategory, {force: true})
        if (!warnCategory) {
            throw new ChannelNotFoundError(DefaultConfig.guild.warnCategory)
        }

        if (warnCategory.type !== ChannelType.GuildCategory) {
            throw new InvalidChannelTypeError(warnCategory, ChannelType.GuildCategory)
        }

        for (const [, channel] of await warnCategory.guild.channels.fetch()) {
            if (!channel.isTextBased() || channel.parent !== warnCategory) {
                continue
            }

            const messages = await channel.messages.fetch({limit: 1})
            if (messages.some(message => message.author === member.client.user && message.mentions.has(user))) {
                await channel.delete()
                break
            }
        }
    }
}