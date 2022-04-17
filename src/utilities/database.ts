import {GuildMember, User} from "discord.js"
import {Notion} from "../clients"
import {Config} from "../config"

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

async function createUser(member: GuildMember, penalty = "0: Nothing", reason?: string) {
    const result = await Notion.pages.create({
        parent: {
            database_id: Config.databaseId
        },
        properties: {
            "ID": {
                rich_text: [
                    {
                        text: {
                            content: member.user.id
                        },
                    },
                ],
            },
            "Name": {
                title: [
                    {
                        text: {
                            content: member?.nickname ? `${member.user.tag} (${member.nickname})` : member.user.tag
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
                multi_select: reason ? [{name: reason}] : [],
            },
        },
    })

    if (!("url" in result)) {
        throw new Error("Page creation failed")
    }

    return result
}

async function* getAllBlocks(user: User) {
    const page = await getWatchlistPage(user)
    if (!page) {
        return
    }

    let response = undefined
    while (!response || response?.has_more) {
        response = await Notion.blocks.children.list({
            block_id: page.id,
            // I love TypeScript (this is sarcasm)
            start_cursor: response && "next_cursor" in response ? response.next_cursor ?? undefined : undefined,
        })

        for (const block of response.results) {
            yield block
        }
    }
}

async function* getEntireDatabase() {
    let response = undefined
    while (!response || response?.has_more) {
        response = await Notion.databases.query({
            database_id: Config.databaseId,
            start_cursor: response && "next_cursor" in response ? response.next_cursor ?? undefined : undefined,
        })

        for (const result of response.results) {
            yield result
        }
    }
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
            id: id.rich_text.map(t => t.plain_text).join(""),
            name: name.title.map(t => t.plain_text).join(""),
            currentPenalty: currentPenalty.select.name,
            reasons: reasons.multi_select?.map(x => x.name),
            lastEdited: new Date(lastEditedTime.last_edited_time),
            lastEditedBy: lastEditedByUser.name,
            url: result.url,
        }
    }

    static async watchlistUpdate(member: GuildMember, reason: string, penalty: string) {
        const page = await getWatchlistPage(member.user)
        if (!page) {
            return (await createUser(member, penalty, reason)).url
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
                                content: member.user.id
                            },
                        },
                    ],
                },
                "Name": {
                    title: [
                        {
                            text: {
                                content: member?.nickname ? `${member.user.tag} (${member.nickname})` : member.user.tag
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

    static async addNote(member: GuildMember, content: string, title?: string, attachment?: string) {
        const page = await getWatchlistPage(member.user) ?? await createUser(member)

        // `any` has to be used because Notion uses autogenerated types that aren't exported.
        // Very unfortunate too, since these are complex objects :/
        // https://developers.notion.com/reference/patch-block-children
        const newChildren: any[] = []
        if (title) {
            newChildren.push({
                object: "block",
                type: "heading_1",
                heading_1: {
                    rich_text: [
                        {
                            type: "text",
                            text: {
                                content: title
                            },
                        },
                    ],
                },
            })
        }

        newChildren.push({
            object: "block",
            type: "paragraph",
            paragraph: {
                rich_text: [
                    {
                        type: "text",
                        text: {
                            content: content
                        },
                    },
                ],
            },
        })

        if (attachment) {
            newChildren.push({
                object: "block",
                type: "file",
                file: {
                    type: "external",
                    external: {
                        url: attachment,
                    },
                },
            })
        }

        await Notion.blocks.children.append({
            block_id: page.id,
            children: [
                ...newChildren,
            ],
        })
    }

    static async* getNotes(user: User) {
        for await (const block of getAllBlocks(user)) {
            if (!("type" in block)) {
                continue
            }

            yield block
        }
    }

    static async* getIdNamePairs() {
        for await (const result of getEntireDatabase()) {
            if (!("properties" in result)) {
                continue
            }

            const id = result.properties["ID"]
            const name = result.properties["Name"]

            if (id?.type !== "rich_text" || name?.type !== "title") {
                continue
            }

            yield {
                id: id.rich_text.map(t => t.plain_text).join(""),
                name: name.title.map(t => t.plain_text).join(""),
            }
        }
    }
}