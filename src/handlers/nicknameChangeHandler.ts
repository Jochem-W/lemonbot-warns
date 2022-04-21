import {GuildMember, PartialGuildMember} from "discord.js"
import HandlerWrapper from "../types/handlerWrapper"
import InteractionHelper from "../utilities/interactionHelper"
import Database from "../utilities/database"

export default class NicknameChangeHandler extends HandlerWrapper {
    constructor() {
        super("guildMemberUpdate")
    }

    async handle(oldMember: GuildMember | PartialGuildMember, newMember: GuildMember) {
        if (!oldMember.partial && oldMember.nickname === newMember.nickname) {
            return
        }

        const newName = InteractionHelper.getName(newMember)
        const entry = await Database.getEntry(newMember)
        if (!entry || entry.name === newName) {
            return
        }

        console.log(`Changing ${newMember.id}'s name to '${newName}' (partial: ${oldMember.partial})`)
        await Database.updateEntry(newMember, newName)
    }
}