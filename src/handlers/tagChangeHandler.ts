import {PartialUser, User} from "discord.js"
import HandlerWrapper from "../wrappers/handlerWrapper"
import DatabaseUtilities from "../utilities/databaseUtilities"
import InteractionUtilities from "../utilities/interactionUtilities"
import Config from "../config"

export default class TagChangeHandler extends HandlerWrapper {
    constructor() {
        super("userUpdate")
    }

    async handle(oldUser: User | PartialUser, newUser: User) {
        if (!oldUser.partial && oldUser.tag === newUser.tag) {
            return
        }

        const guild = await newUser.client.guilds.fetch(Config.guildId)
        const member = await guild.members.fetch(newUser)
        const newName = InteractionUtilities.getName(member)
        const entry = await DatabaseUtilities.getEntry(member)
        if (!entry || entry.name === newName) {
            return
        }

        console.log(`Changing ${member.id}'s name to '${newName}' (partial: ${oldUser.partial})`)
        await DatabaseUtilities.updateEntry(member, {name: newName})
    }
}