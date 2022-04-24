import {GuildMember, Message, ThreadMember, User, UserResolvable} from "discord.js"
import {Notion} from "../clients"
import {Variables} from "../variables"
import {CreatePageResponse, QueryDatabaseResponse, UpdatePageResponse} from "@notionhq/client/build/src/api-endpoints"
import {DateTime} from "luxon"

export type DatabaseEntry = {
    id: string
    name: string
    currentPenaltyLevel: string
    reasons: string[]
    lastEditedTime: DateTime
    url: string
    pageId: string
}

export type NoteContent = {
    title?: string
    body?: string
    url?: string
    image?: string
}

export default class Database {
    static async getPenaltyLevels() {
        const database = await Notion.databases.retrieve({database_id: Variables.databaseId})
        const penaltyLevel = database.properties["Penalty Level"]
        if (!(penaltyLevel?.type === "select")) {
            throw new Error("Penalty level is not a select")
        }

        return penaltyLevel.select.options.map(o => o.name)
    }

    static async getReasons() {
        const database = await Notion.databases.retrieve({database_id: Variables.databaseId})
        const reasons = database.properties["Reasons"]
        if (!(reasons?.type === "multi_select")) {
            throw new Error("Penalty level is not a select")
        }

        return reasons.multi_select.options.map(o => o.name)
    }

    static async* getEntries() {
        let response = undefined
        while (!response || response.has_more) {
            response = await Notion.databases.query({
                database_id: Variables.databaseId,
                start_cursor: response && "next_cursor" in response ? response.next_cursor ?? undefined : undefined,
            })

            for (const entry of this.toDatabaseEntries(response)) {
                yield entry
            }
        }
    }

    static async getEntry(user: UserResolvable): Promise<DatabaseEntry | null> {
        const id = this.resolveUser(user)
        const queryResponse = await Notion.databases.query({
            database_id: Variables.databaseId,
            filter: {
                property: "ID",
                type: "rich_text",
                rich_text: {
                    equals: id,
                },
            },
        })

        switch (queryResponse.results.length) {
        case 0:
            return null
        case 1:
            return this.toDatabaseEntries(queryResponse)[0]
        default:
            throw new Error(`Multiple entries found for ${id}`)
        }
    }

    static async updateEntry(user: UserResolvable,
                             name?: string,
                             currentPenaltyLevel?: string,
                             reasons?: string[]): Promise<DatabaseEntry> {
        const entry = await this.getEntry(user)
        if (!entry && name) {
            return this.createEntry(user, name, currentPenaltyLevel, reasons)
        }

        if (!entry) {
            throw new Error(`No entry found for ${user} and no name provided`)
        }

        return this.toDatabaseEntries(await Notion.pages.update({
            page_id: entry.pageId,
            properties: {
                "Name [Server Nickname]": {
                    title: [
                        {
                            text: {
                                content: name ?? entry.name,
                            },
                        },
                    ],
                },
                "Penalty Level": {
                    select: {
                        name: currentPenaltyLevel ?? entry.currentPenaltyLevel,
                    },
                },
                "Reasons": {
                    multi_select: entry.reasons.concat(reasons ?? []).map(reason => {
                        return {
                            name: reason,
                        }
                    }),
                },
            },
        }))[0]
    }

    static async createEntry(user: UserResolvable,
                             name: string,
                             currentPenaltyLevel = "0: Nothing",
                             reasons?: string[]): Promise<DatabaseEntry> {
        const entry = await this.getEntry(user)
        if (entry) {
            throw new Error(`Entry already exists for ${user}`)
        }

        const id = this.resolveUser(user)
        return this.toDatabaseEntries(await Notion.pages.create({
            parent: {
                database_id: Variables.databaseId,
            },
            properties: {
                "ID": {
                    rich_text: [
                        {
                            text: {
                                content: id,
                            },
                        },
                    ],
                },
                "Name [Server Nickname]": {
                    title: [
                        {
                            text: {
                                content: name,
                            },
                        },
                    ],
                },
                "Penalty Level": {
                    select: {
                        name: currentPenaltyLevel,
                    },
                },
                "Reasons": {
                    multi_select: reasons?.map(reason => {
                        return {
                            name: reason,
                        }
                    }) ?? [],
                },
            },
        }))[0]
    }

    static async addNote(user: UserResolvable, content: NoteContent, name?: string): Promise<string> {
        let entry = await this.getEntry(user)
        if (!entry && name) {
            entry = await this.createEntry(user, name)
        }

        if (!entry) {
            throw new Error(`No entry found for ${user} and no name provided`)
        }

        // `any` has to be used because Notion uses autogenerated types that aren't exported.
        // Very unfortunate too, since these are complex objects :/
        // https://developers.notion.com/reference/patch-block-children
        const newChildren: any[] = []
        if (content.title) {
            newChildren.push({
                object: "block",
                type: "heading_1",
                heading_1: {
                    rich_text: [
                        {
                            type: "text",
                            text: {
                                content: content.title,
                            },
                        },
                    ],
                },
            })
        }

        if (content.body) {
            newChildren.push({
                object: "block",
                type: "paragraph",
                paragraph: {
                    rich_text: [
                        {
                            type: "text",
                            text: {
                                content: content.body,
                                link: content.url ? {url: content.url} : undefined,
                            },
                        },
                    ],
                },
            })
        }

        if (content.image) {
            newChildren.push({
                object: "block",
                type: "image",
                image: {
                    type: "external",
                    external: {
                        url: content.image,
                    },
                },
            })
        }

        await Notion.blocks.children.append({
            block_id: entry.pageId,
            children: [...newChildren],
        })

        return entry.url
    }

    static async* getNotes(user: UserResolvable) {
        const entry = await this.getEntry(user)
        if (!entry) {
            return null
        }

        let response = undefined
        while (!response || response.has_more) {
            response = await Notion.blocks.children.list({
                block_id: entry.pageId,
                // I love TypeScript (this is sarcasm)
                start_cursor: response && "next_cursor" in response ? response.next_cursor ?? undefined : undefined,
            })

            for (const block of response.results) {
                if (!("type" in block)) {
                    continue
                }

                yield block
            }
        }
    }

    private static resolveUser(user: UserResolvable): string {
        if (user instanceof User || user instanceof GuildMember || user instanceof ThreadMember) {
            return user.id
        }

        if (user instanceof Message) {
            return user.author.id
        }

        return user
    }

    // TODO: turn this into a generator
    private static toDatabaseEntries(response: QueryDatabaseResponse | UpdatePageResponse | CreatePageResponse): DatabaseEntry[] {
        const results = []
        if ("properties" in response) {
            results.push(response)
        } else if ("results" in response) {
            response.results.map(result => "properties" in result && results.push(result))
        } else {
            throw new Error("Invalid response")
        }

        const entries = []
        for (const result of results) {
            const id = result.properties["ID"]
            if (id?.type !== "rich_text") {
                throw new Error("Malformed ID")
            }

            const name = result.properties["Name [Server Nickname]"]
            if (name?.type !== "title") {
                throw new Error("Malformed name")
            }

            const currentPenalty = result.properties["Penalty Level"]
            if (currentPenalty?.type !== "select" || !currentPenalty.select) {
                throw new Error("Malformed penalty level")
            }

            const reasons = result.properties["Reasons"]
            if (reasons?.type !== "multi_select") {
                throw new Error("Malformed reasons")
            }

            const lastEditedTime = result.properties["Last edited time"]
            if (lastEditedTime?.type !== "last_edited_time") {
                throw new Error("Malformed last edited time for")
            }

            // const lastEditedBy = result.properties["Last edited by"]
            // if (lastEditedBy?.type !== "last_edited_by") {
            //     throw new Error("Malformed last edited by")
            // }
            //
            // const lastEditedByUser = lastEditedBy.last_edited_by
            // if (!("name" in lastEditedByUser) || !lastEditedByUser.name) {
            //     throw new Error("The Notion integration doesn't have access to user information")
            // }

            entries.push({
                id: id.rich_text.map(t => t.plain_text).join(""),
                name: name.title.map(t => t.plain_text).join(""),
                currentPenaltyLevel: currentPenalty.select.name,
                reasons: reasons.multi_select.map(x => x.name),
                lastEditedTime: DateTime.fromISO(lastEditedTime.last_edited_time),
                // lastEditedBy: lastEditedByUser.name,
                url: result.url,
                pageId: result.id,
            })
        }

        return entries
    }
}