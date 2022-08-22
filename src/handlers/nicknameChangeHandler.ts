import {GuildMember, PartialGuildMember} from "discord.js"
import {NotionDatabase} from "../models/notionDatabase"
import {Handler} from "../interfaces/handler"
import {PageNotFoundError} from "../errors"
import {formatName} from "../utilities/notionUtilities"

export class NicknameChangeHandler implements Handler<"guildMemberUpdate"> {
    public readonly event = "guildMemberUpdate"
    public readonly once = false

    public async handle(oldMember: GuildMember | PartialGuildMember, newMember: GuildMember): Promise<void> {
        if (!oldMember.partial && oldMember.nickname === newMember.nickname) {
            return
        }

        const database = await NotionDatabase.getDefault()
        try {
            const entry = await database.update(newMember, {name: formatName(newMember)})
            console.log(`Changed ${newMember.id}'s name to '${entry.name}'`)
        } catch (e) {
            if (!(e instanceof PageNotFoundError)) {
                throw e
            }
        }
    }
}