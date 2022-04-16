import {GuildMember, User} from "discord.js";
import {Notion} from "../clients";
import {Config} from "../config";

let reasons

async function getWatchlistPage(user: User) {
    const query = await Notion.databases.query({
        database_id: Config.databaseId,
        filter: {
            property: "ID",
            type: "rich_text",
            rich_text: {
                equals: user.id
            },
        },
    })

    switch (query.results.length) {
        case 0:
            return null
        case 1:
            break
        default:
            throw new Error(`Multiple users found with ID ${user.id}`)
    }

    const result = query.results[0]
    if (!("properties" in result)) {
        throw new Error(`User with ID ${user.id} doesn't have properties`)
    }

    return result
}

async function createWarnReason(reason: string) {
    const database = await Notion.databases.retrieve({
        database_id: Config.databaseId,
    })

    reasons = database.properties["Reasons"]
    if (reasons.type !== "multi_select") {
        throw new Error("Reasons isn't a multi-select")
    }

    if (reasons.multi_select.options.find(r => r.name === reason)) {
        return
    }

    await Notion.databases.update({
        database_id: "e40b49e15c64401a8209918452ebcb9c",
        properties: {
            "Reasons": {
                multi_select: {
                    options: [
                        {
                            name: reason
                        }, ...reasons.multi_select.options,
                    ],
                },
            },
        },
    })
}

export default class Database {
    static async watchlistLookup(user: User) {
        const result = await getWatchlistPage(user)
        if (!result) {
            return null
        }

        const id = result.properties["ID"]
        const name = result.properties["Name"]
        const currentPenalty = result.properties["Current penalty level"]
        const reasons = result.properties["Reasons"]
        const lastEditedTime = result.properties["Last edited time"]
        const lastEditedBy = result.properties["Last edited by"]

        if (id?.type !== "rich_text") {
            throw new Error(`User with ID ${user.id} doesn't have a rich text ID`)
        }

        if (name?.type !== "title") {
            throw new Error(`User with ID ${user.id} doesn't have a title name`)
        }

        if (currentPenalty?.type !== "select" || !currentPenalty.select) {
            throw new Error(`User with ID ${user.id} doesn't have a select penalty`)
        }

        if (reasons?.type !== "multi_select") {
            throw new Error(`User with ID ${user.id} doesn't have a multi-select reasons`)
        }

        if (lastEditedTime?.type !== "last_edited_time") {
            throw new Error(`User with ID ${user.id} doesn't have a last edited time`)
        }

        if (lastEditedBy?.type !== "last_edited_by") {
            throw new Error(`User with ID ${user.id} doesn't have a last edited by`)
        }

        const lastEditedByUser = lastEditedBy.last_edited_by
        if (!("name" in lastEditedByUser) || !lastEditedByUser.name) {
            throw new Error("The Notion integration doesn't have access to user information")
        }

        return {
            id: id.rich_text[0].plain_text,
            name: name.title[0].plain_text,
            currentPenalty: currentPenalty.select.name,
            reasons: reasons.multi_select?.map(x => x.name),
            lastEdited: new Date(lastEditedTime.last_edited_time),
            lastEditedBy: lastEditedByUser.name,
            url: result.url,
        }
    }

    static async watchlistUpdate(user: User, reason: string, penalty: string, member?: GuildMember) {
        await createWarnReason(reason)

        const page = await getWatchlistPage(user)
        if (page === null) {
            const result = await Notion.pages.create({
                parent: {
                    database_id: Config.databaseId
                },
                properties: {
                    "ID": {
                        rich_text: [
                            {
                                text: {
                                    content: user.id
                                },
                            },
                        ],
                    },
                    "Name": {
                        title: [
                            {
                                text: {
                                    content: user.tag
                                },
                            },
                        ],
                    },
                    "Current penalty level": {
                        select: {
                            name: penalty
                        },
                    },
                    "Reasons": {
                        multi_select: [
                            {
                                name: reason
                            },
                        ],
                    },
                },
            })

            if (!("url" in result)) {
                throw new Error("Page creation failed")
            }

            return result.url
        }

        if (page.properties["Reasons"]?.type !== "multi_select") {
            throw new Error("Reasons isn't a multi select")
        }

        const result = await Notion.pages.update({
            page_id: page.id,
            properties: {
                "ID": {
                    rich_text: [
                        {
                            text: {
                                content: user.id
                            },
                        },
                    ],
                },
                "Name": {
                    title: [
                        {
                            text: {
                                content: member?.nickname ? `${user.tag} (${member.nickname})` : user.tag
                            },
                        },
                    ],
                },
                "Current penalty level": {
                    select: {
                        name: penalty
                    },
                },
                "Reasons": {
                    multi_select: [
                        {
                            name: reason
                        }, ...page.properties["Reasons"].multi_select
                    ],
                },
            },
        })

        if (!("url" in result)) {
            throw new Error("Page editing failed")
        }

        return result.url
    }
}