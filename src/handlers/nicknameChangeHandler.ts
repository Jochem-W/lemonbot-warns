import {GuildMember, PartialGuildMember} from "discord.js"
import HandlerWrapper from "../wrappers/handlerWrapper"
import InteractionUtilities from "../utilities/interactionUtilities"
import DatabaseUtilities from "../utilities/databaseUtilities"

export default class NicknameChangeHandler extends HandlerWrapper {
    constructor() {
        super("guildMemberUpdate")
    }

    async handle(oldMember: GuildMember | PartialGuildMember, newMember: GuildMember) {
        if (!oldMember.partial && oldMember.nickname === newMember.nickname) {
            return
        }

        const newName = InteractionUtilities.getName(newMember)
        const entry = await DatabaseUtilities.getEntry(newMember)
        if (!entry || entry.name === newName) {
            return
        }

        console.log(`Changing ${newMember.id}'s name to '${newName}' (partial: ${oldMember.partial})`)
        await DatabaseUtilities.updateEntry(newMember, newName)
    }
}