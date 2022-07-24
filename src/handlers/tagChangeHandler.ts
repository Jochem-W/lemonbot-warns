import {GuildMember, PartialGuildMember} from "discord.js"
import {NotionDatabase} from "../models/notionDatabase"
import {NotionUtilities} from "../utilities/notionUtilities"
import {Handler} from "../interfaces/handler"
import {PageNotFoundError} from "../errors"

export class NicknameChangeHandler implements Handler<"guildMemberUpdate"> {
    public readonly event = "guildMemberUpdate"

    public async handle(oldMember: GuildMember | PartialGuildMember, newMember: GuildMember): Promise<void> {
        if (!oldMember.partial && oldMember.nickname === newMember.nickname) {
            return
        }

        const database = await NotionDatabase.getDefault()
        try {
            const entry = await database.update(newMember, {name: NotionUtilities.formatName(newMember)})
            console.log(`Changed ${newMember.id}'s name to '${entry.name}'`)
        } catch (e) {
            if (!(e instanceof PageNotFoundError)) {
                console.error(e)
            }
        }
    }
}