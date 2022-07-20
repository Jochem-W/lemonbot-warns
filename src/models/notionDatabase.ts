import {Notion} from "../clients"
import {DateTime} from "luxon"
import {
    BlockObjectRequest,
    BlockObjectResponse,
    PagePropertyItemResponse,
    SelectPropertyRequest,
    SelectPropertyResponse,
} from "../types/notion"
import {
    GetPagePropertyParameters,
    ListBlockChildrenParameters,
    QueryDatabaseParameters,
    UpdatePageParameters,
} from "@notionhq/client/build/src/api-endpoints"
import {Variables} from "../variables"
import LRUCache from "lru-cache"
import {Config} from "./config"

async function getActualPageProperty(parameters: GetPagePropertyParameters): Promise<PagePropertyItemResponse> {
    const response = await Notion.pages.properties.retrieve(parameters)
    if (response.type === "property_item") {
        if (response.results.length === 0 || response.results.length > 1) {
            throw new Error(`Expected 1 result, got ${response.results.length}`)
        }

        return response.results[0]!
    }

    return response
}

export type NotionDatabaseEntry = {
    id: string
    lastEditedTime: DateTime
    currentPenaltyLevel: string
    watchlist: boolean
    lastEditedBy: string | undefined
    reasons: SelectPropertyResponse[]
    name: string
    url: string
    pageId: string
}

export type NotionDatabaseEntryEdit = Partial<Pick<NotionDatabaseEntry, "currentPenaltyLevel" | "watchlist" | "name"> & { reasons: SelectPropertyRequest[] }>

export class NotionDatabase {
    private static defaultDatabase?: NotionDatabase

    public readonly databaseId: string
    public readonly pageUrl: string
    private readonly idPropertyId: string
    private readonly lastEditedTimePropertyId: string
    private readonly penaltyLevelPropertyId: string
    private readonly watchlistPropertyId: string
    private readonly lastEditedByPropertyId: string
    private readonly reasonsPropertyId: string
    private readonly namePropertyId: string

    private readonly cache = new LRUCache({
        ttl: Config.cacheTtl.toMillis(),
        ttlAutopurge: true,
        fetchMethod: async (key: string) => {
            switch (key) {
            case "reasons": {
                const response = await Notion.databases.retrieve({database_id: this.databaseId})
                const reasonsProperty = response.properties["Reasons"]
                if (reasonsProperty?.id !== this.reasonsPropertyId || !(reasonsProperty.type === "multi_select")) {
                    throw new Error(`No valid reasons property found for database ${this.databaseId}`)
                }

                return reasonsProperty.multi_select.options
            }
            default:
                return null
            }
        },
        disposeAfter: async (_, key) => {
            await this.cache.fetch(key)
        },
    })

    private constructor(databaseId: string, idPropertyId: string, lastEditedTimePropertyId: string,
                        penaltyLevelPropertyId: string, watchlistPropertyId: string, lastEditedByPropertyId: string,
                        reasonsPropertyId: string, namePropertyId: string, parentUrl: string) {
        this.databaseId = databaseId
        this.idPropertyId = idPropertyId
        this.lastEditedTimePropertyId = lastEditedTimePropertyId
        this.penaltyLevelPropertyId = penaltyLevelPropertyId
        this.watchlistPropertyId = watchlistPropertyId
        this.lastEditedByPropertyId = lastEditedByPropertyId
        this.reasonsPropertyId = reasonsPropertyId
        this.namePropertyId = namePropertyId
        this.pageUrl = parentUrl
    }

    public static async getDefault(): Promise<NotionDatabase> {
        NotionDatabase.defaultDatabase ??= await NotionDatabase.fromPage(Variables.notionPageId)
        return NotionDatabase.defaultDatabase
    }

    public static async fromPage(id: string): Promise<NotionDatabase> {
        const page = await Notion.pages.retrieve({page_id: id})
        if (!("url" in page)) {
            throw new Error("Page does not have a url")
        }

        const parameters: ListBlockChildrenParameters = {block_id: id}
        do {
            const response = await Notion.blocks.children.list(parameters)
            for (let child of response.results) {
                if (!("type" in child) || child.type !== "child_database") {
                    continue
                }

                const database = await Notion.databases.retrieve({database_id: child.id})
                const idProperty = database.properties["ID"]
                const lastEditedTimeProperty = database.properties["Last edited time"]
                const penaltyLevelProperty = database.properties["Penalty Level"]
                const watchlistProperty = database.properties["Watchlist"]
                const lastEditedByProperty = database.properties["Last edited by"]
                const reasonsProperty = database.properties["Reasons"]
                const nameProperty = database.properties["Name [Server Nickname]"]
                if (!idProperty || !lastEditedTimeProperty || !penaltyLevelProperty || !watchlistProperty ||
                    !lastEditedByProperty || !reasonsProperty || !nameProperty) {
                    continue
                }

                if (idProperty.type !== "rich_text" || lastEditedTimeProperty.type !== "last_edited_time" ||
                    penaltyLevelProperty.type !== "select" || watchlistProperty.type !== "checkbox" ||
                    lastEditedByProperty.type !== "last_edited_by" || reasonsProperty.type !== "multi_select" ||
                    nameProperty.type !== "title") {
                    throw new Error("Invalid database properties")
                }

                const notionDatabase = new NotionDatabase(database.id,
                    idProperty.id,
                    lastEditedTimeProperty.id,
                    penaltyLevelProperty.id,
                    watchlistProperty.id,
                    lastEditedByProperty.id,
                    reasonsProperty.id,
                    nameProperty.id,
                    page.url)
                await notionDatabase.cache.fetch("reasons")
                return notionDatabase
            }
            parameters.start_cursor = response.next_cursor ?? undefined
        } while (parameters.start_cursor)

        throw new Error("No database found")
    }

    public async getReasons(force?: boolean): Promise<SelectPropertyResponse[]> {
        if (force || !this.cache.has("reasons")) {
            await this.cache.fetch("reasons")
        }

        const reasons = this.cache.get("reasons")
        if (!reasons) {
            throw new Error("No reasons found")
        }

        return reasons
    }

    public async* getMany(): AsyncGenerator<NotionDatabaseEntry> {
        const parameters: QueryDatabaseParameters = {
            database_id: this.databaseId,
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
        }
        do {
            const response = await Notion.databases.query(parameters)
            for (const result of response.results) {
                yield await this.getByPageId(result.id, "url" in result ? result.url : undefined)
            }

            parameters.start_cursor = response.next_cursor ?? undefined
        } while (parameters.start_cursor)
    }

    public async getByDiscordId(id: string): Promise<NotionDatabaseEntry | null> {
        const response = await Notion.databases.query({
            database_id: this.databaseId,
            filter: {
                property: this.idPropertyId,
                rich_text: {
                    equals: id,
                },
            },
        })

        if (response.results.length > 1) {
            throw new Error(`Multiple entries found for id ${id}`)
        }

        const result = response.results[0]
        if (!result) {
            return null
        }

        return await this.getByPageId(result.id, "url" in result ? result.url : undefined)
    }

    public async create(id: string, data: Required<NotionDatabaseEntryEdit>): Promise<NotionDatabaseEntry> {
        if (await this.getByDiscordId(id)) {
            throw new Error(`Entry for id ${id} already exists`)
        }

        const response = await Notion.pages.create({
            parent: {
                database_id: this.databaseId,
                type: "database_id",
            },
            properties: this.getProperties(data, id),
        })

        return await this.getByPageId(response.id)
    }

    public async update(target: { pageId: string } | { id: string } | NotionDatabaseEntry,
                        data: NotionDatabaseEntryEdit): Promise<NotionDatabaseEntry> {
        const fullEntry = await ("pageId" in target ? this.getByPageId(target.pageId) : this.getByDiscordId(target.id))
        if (!fullEntry) {
            throw new Error(`No entry found for ${target}`)
        }

        const response = await Notion.pages.update({
            page_id: fullEntry.pageId,
            properties: this.getProperties(data),
        })

        return await this.getByPageId(response.id)
    }

    public async appendBlocks(target: { pageId: string } | { id: string },
                              blocks: BlockObjectRequest[]): Promise<void> {
        if (!("pageId" in target)) {
            const fullEntry = await this.getByDiscordId(target.id)
            if (!fullEntry) {
                throw new Error(`No entry found for id ${target.id}`)
            }

            target = {pageId: fullEntry.pageId}
        }

        await Notion.blocks.children.append({
            block_id: target.pageId,
            children: blocks,
        })
    }

    public async* getBlocks(target: { pageId: string } | { id: string }): AsyncGenerator<BlockObjectResponse> {
        if (!("pageId" in target)) {
            const fullEntry = await this.getByDiscordId(target.id)
            if (!fullEntry) {
                throw new Error(`No entry found for id ${target.id}`)
            }

            target = {pageId: fullEntry.pageId}
        }

        const parameters: ListBlockChildrenParameters = {block_id: target.pageId}
        do {
            const response = await Notion.blocks.children.list(parameters)
            for (const child of response.results) {
                if (!("type" in child)) {
                    throw new Error(`No type found for block ${child.id}`)
                }

                yield child
            }

            parameters.start_cursor = response.next_cursor ?? undefined
        } while (parameters.start_cursor)
    }

    private getProperties(data: NotionDatabaseEntryEdit, id?: string): NonNullable<UpdatePageParameters["properties"]> {
        const properties: UpdatePageParameters["properties"] = {}
        if (id) {
            properties[this.idPropertyId] = {rich_text: [{text: {content: id}}]}
        }

        if (data.currentPenaltyLevel) {
            properties[this.penaltyLevelPropertyId] = {select: {name: data.currentPenaltyLevel}}
        }

        if (data.watchlist !== undefined) {
            properties[this.watchlistPropertyId] = {checkbox: data.watchlist}
        }

        if (data.reasons) {
            properties[this.reasonsPropertyId] = {multi_select: data.reasons}
        }

        if (data.name) {
            properties[this.namePropertyId] = {title: [{text: {content: data.name}}]}
        }

        return properties
    }

    private async getByPageId(pageId: string, pageUrl?: string): Promise<NotionDatabaseEntry> {
        if (!pageUrl) {
            const response = await Notion.pages.retrieve({page_id: pageId})
            if (!("url" in response)) {
                throw new Error("URL not found for page")
            }

            pageUrl = response.url
        }

        const idProperty = await getActualPageProperty({
            page_id: pageId,
            property_id: this.idPropertyId,
        })
        const lastEditedTimeProperty = await getActualPageProperty({
            page_id: pageId,
            property_id: this.lastEditedTimePropertyId,
        })
        const penaltyLevelProperty = await getActualPageProperty({
            page_id: pageId,
            property_id: this.penaltyLevelPropertyId,
        })
        const watchlistProperty = await getActualPageProperty({
            page_id: pageId,
            property_id: this.watchlistPropertyId,
        })
        const lastEditedByProperty = await getActualPageProperty({
            page_id: pageId,
            property_id: this.lastEditedByPropertyId,
        })
        const reasonsProperty = await getActualPageProperty({
            page_id: pageId,
            property_id: this.reasonsPropertyId,
        })
        const nameProperty = await getActualPageProperty({
            page_id: pageId,
            property_id: this.namePropertyId,
        })

        if (idProperty.type !== "rich_text" || lastEditedTimeProperty.type !== "last_edited_time" ||
            penaltyLevelProperty.type !== "select" || watchlistProperty.type !== "checkbox" ||
            lastEditedByProperty.type !== "last_edited_by" || reasonsProperty.type !== "multi_select" ||
            nameProperty.type !== "title") {
            throw new Error(`Unexpected property type for page ${pageId}`)
        }

        if (!penaltyLevelProperty.select) {
            throw new Error(`No penalty level found for page ${pageId}`)
        }

        return {
            id: idProperty.rich_text.plain_text,
            lastEditedTime: DateTime.fromISO(lastEditedTimeProperty.last_edited_time),
            currentPenaltyLevel: penaltyLevelProperty.select.name,
            watchlist: watchlistProperty.checkbox,
            lastEditedBy: "name" in lastEditedByProperty.last_edited_by ?
                lastEditedByProperty.last_edited_by.name ?? undefined :
                undefined,
            reasons: reasonsProperty.multi_select,
            name: nameProperty.title.plain_text,
            url: pageUrl,
            pageId: pageId,
        }
    }
}