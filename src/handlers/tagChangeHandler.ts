import {PartialUser, User} from "discord.js"
import {NotionDatabase} from "../models/notionDatabase"
import {Handler} from "../interfaces/handler"
import {PageNotFoundError} from "../errors"
import {formatName} from "../utilities/notionUtilities"

export class TagChangeHandler implements Handler<"userUpdate"> {
    public readonly event = "userUpdate"

    public async handle(oldUser: User | PartialUser, newUser: User): Promise<void> {
        if (!oldUser.partial && oldUser.tag === oldUser.tag) {
            return
        }

        const database = await NotionDatabase.getDefault()
        try {
            const entry = await database.update(newUser, {name: formatName(newUser)})
            console.log(`Changed ${newUser.id}'s name to '${entry.name}'`)
        } catch (e) {
            if (!(e instanceof PageNotFoundError)) {
                throw e
            }
        }
    }
}