import {GuildMember, Message, ThreadMember, User, UserResolvable} from "discord.js"
import {Notion} from "../clients"
import {Variables} from "../variables"
import {CreatePageResponse, QueryDatabaseResponse, UpdatePageResponse} from "@notionhq/client/build/src/api-endpoints"
import {DateTime} from "luxon"
import {BlockObjectRequest, BlockObjectResponse} from "../types/notion"
import LRUCache from "lru-cache"
import Config from "../config"

export type DatabaseEntry = {
    id: string
    name: string
    currentPenaltyLevel: string
    reasons: string[]
    watchlist: boolean
    lastEditedTime: DateTime
    url: string
    pageId: string
}

export type AddNotesData = {
    content: BlockObjectRequest[],
    name?: string,
}

export type CreateEntryData =
    Pick<DatabaseEntry, "name" | "currentPenaltyLevel">
    & Pick<Partial<DatabaseEntry>, "reasons" | "watchlist">

export type UpdateEntryData = Pick<Partial<DatabaseEntry>, "name" | "currentPenaltyLevel" | "reasons" | "watchlist">

export default class DatabaseUtilities {
    private static readonly cache = new LRUCache({
        ttl: Config.cacheTtl.toMillis(),
        max: 2,
        ttlAutopurge: true,
        fetchMethod: async (key: string) => {
            switch (key) {
            case "reasons": {
                const database = await Notion.databases.retrieve({database_id: Variables.databaseId})
                const reasons = database.properties["Reasons"]
                if (!(reasons?.type === "multi_select")) {
                    throw new Error("Penalty level is not a select")
                }

                return reasons.multi_select.options.map(o => o.name)
            }
            default:
                return null
            }
        },
        disposeAfter: async (value, key) => {
            await this.cache.fetch(key)
        },
    })
    private static parentUrl: string | undefined

    static async initialiseCache() {
        this.cache.clear()
        await this.cache.fetch("reasons")
    }

    static async checkPenalties(): Promise<void> {
        const database = await Notion.databases.retrieve({database_id: Variables.databaseId})
        const penaltyLevel = database.properties["Penalty Level"]
        if (!(penaltyLevel?.type === "select")) {
            throw new Error("Penalty level is not a select")
        }

        const notionPenaltyLevels = penaltyLevel.select.options.map(o => o.name)
        const configPenaltyLevels = Config.penalties.map(penalty => penalty.name)

        if (notionPenaltyLevels.length !==
            configPenaltyLevels.length ||
            !notionPenaltyLevels.every((n, _) => configPenaltyLevels.includes(n))) {
            throw new Error("Penalty levels do not match")
        }
    }

    static async getParentUrl(): Promise<string> {
        if (this.parentUrl) {
            return this.parentUrl
        }

        const database = await Notion.databases.retrieve({database_id: Variables.databaseId})
        if (!("url" in database)) {
            throw new Error("Database has no url")
        }

        if (database.parent.type !== "page_id") {
            throw new Error("Database parent is not a page")
        }

        const page = await Notion.pages.retrieve({page_id: database.parent.page_id})
        if (!("url" in page)) {
            throw new Error("Database parent has no url")
        }

        this.parentUrl = page.url
        return this.parentUrl
    }

    static async getReasons(): Promise<string[]> {
        const value = await this.cache.fetch<string[]>("reasons")
        if (!value) {
            throw new Error("Failed to fetch reasons")
        }

        return value
    }

    static async* getEntries(): AsyncGenerator<DatabaseEntry> {
        let response = undefined
        while (!response || response.has_more) {
            response = await Notion.databases.query({
                database_id: Variables.databaseId,
                start_cursor: response && "next_cursor" in response ? response.next_cursor ?? undefined : undefined,
                sorts: [
                    {
                        property: "Watchlist",
                        direction: "descending",
                    },
                    {
                        property: "Penalty Level",
                        direction: "descending",
                    },
                    {
                        property: "Name [Server Nickname]",
                        direction: "ascending",
                    },
                ],
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
            return this.toDatabaseEntries(queryResponse)[0] ?? null
        default:
            throw new Error(`Multiple entries found for ${id}`)
        }
    }

    static async updateEntry(user: UserResolvable, data: UpdateEntryData): Promise<DatabaseEntry> {
        const entry = await this.getEntry(user)
        if (!entry && data.name && data.currentPenaltyLevel) {
            // FIXME: don't cast
            const newEntry = await this.createEntry(user, data as CreateEntryData)
            if (!newEntry) {
                throw new Error("Failed to create entry")
            }

            return newEntry
        }

        if (!entry) {
            throw new Error(`No entry found for ${user}`)
        }

        this.updateCache(data.currentPenaltyLevel, data.reasons)

        const updatedEntry = this.toDatabaseEntries(await Notion.pages.update({
            page_id: entry.pageId,
            properties: {
                "Name [Server Nickname]": {
                    title: [
                        {
                            text: {
                                content: data.name ?? entry.name,
                            },
                        },
                    ],
                },
                "Penalty Level": {
                    select: {
                        name: data.currentPenaltyLevel ?? entry.currentPenaltyLevel,
                    },
                },
                "Reasons": {
                    multi_select: entry.reasons.concat(data.reasons ?? []).map(reason => {
                        return {
                            name: reason,
                        }
                    }),
                },
            },
        }))[0]

        if (!updatedEntry) {
            throw new Error("Failed to update entry")
        }

        return updatedEntry
    }

    static async createEntry(user: UserResolvable, data: CreateEntryData): Promise<DatabaseEntry> {
        const entry = await this.getEntry(user)
        if (entry) {
            throw new Error(`Entry already exists for ${user}`)
        }

        this.updateCache(data.currentPenaltyLevel, data.reasons)

        const id = this.resolveUser(user)
        const newEntry = this.toDatabaseEntries(await Notion.pages.create({
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
                                content: data.name,
                            },
                        },
                    ],
                },
                "Penalty Level": {
                    select: {
                        name: data.currentPenaltyLevel,
                    },
                },
                "Reasons": {
                    multi_select: data.reasons?.map(reason => {
                        return {
                            name: reason,
                        }
                    }) ?? [],
                },
            },
        }))[0]

        if (!newEntry) {
            throw new Error("Failed to create entry")
        }

        return newEntry
    }

    static async addNotes(user: UserResolvable, data: AddNotesData): Promise<string> {
        let entry = await this.getEntry(user)
        if (!entry && data.name) {
            entry = await this.createEntry(user, {name: data.name, currentPenaltyLevel: "0: Nothing"})
        }

        if (!entry) {
            throw new Error(`No entry found for ${user} and no name provided`)
        }

        await Notion.blocks.children.append({
            block_id: entry.pageId,
            children: data.content,
        })

        return entry.url
    }

    static async* getNotes(user: UserResolvable): AsyncGenerator<BlockObjectResponse> {
        const entry = await this.getEntry(user)
        if (!entry) {
            return
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

    private static updateCache(penaltyLevel?: string, reasons?: string[]) {
        const storedReasons = this.cache.get<string[]>("reasons")
        if (storedReasons) {
            storedReasons.push(...reasons?.filter(reason => !storedReasons.includes(reason)) ?? [])
            this.cache.set("reasons", storedReasons)
        }

        const storedPenaltyLevels = this.cache.get<string[]>("penaltyLevels")
        if (storedPenaltyLevels && penaltyLevel && !storedPenaltyLevels.includes(penaltyLevel)) {
            storedPenaltyLevels.push(penaltyLevel)
            this.cache.set("penaltyLevels", storedPenaltyLevels)
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

            const watchlist = result.properties["Watchlist"]
            if (watchlist?.type !== "checkbox") {
                throw new Error("Malformed watchlist")
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
                watchlist: watchlist.checkbox,
                lastEditedTime: DateTime.fromISO(lastEditedTime.last_edited_time),
                // lastEditedBy: lastEditedByUser.name,
                url: result.url,
                pageId: result.id,
            })
        }

        return entries
    }
}