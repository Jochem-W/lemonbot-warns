import {Handler} from "../interfaces/handler"
import {GuildMember, PartialGuildMember} from "discord.js"
import {NotionDatabase} from "../models/notionDatabase"
import {NotionUtilities} from "../utilities/notionUtilities"
import {PageNotFoundError} from "../errors"

export class MemberRemoveHandler implements Handler<"guildMemberRemove"> {
    public readonly event = "guildMemberRemove"

    public async handle(member: GuildMember | PartialGuildMember): Promise<void> {
        const user = await member.client.users.fetch(member.id)
        const database = await NotionDatabase.getDefault()
        try {
            const entry = await database.update(user, {name: NotionUtilities.formatName(user)})
            console.log(`Changed ${user.id}'s name to '${entry.name}'`)
        } catch (e) {
            if (!(e instanceof PageNotFoundError)) {
                throw e
            }
        }
    }
}