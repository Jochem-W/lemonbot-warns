import {
    ActionRowBuilder,
    APIActionRowComponent,
    APIButtonComponent,
    APISelectMenuComponent,
    Attachment,
    Client,
    DiscordAPIError,
    GuildMember,
    GuildResolvable,
    Interaction,
    Message,
    MessageActionRowComponentBuilder,
    RESTJSONErrorCodes,
    User,
    UserResolvable,
} from "discord.js"
import {StorageBucket} from "../clients"
import {pipeline} from "stream/promises"
import MIMEType from "whatwg-mimetype"
import {NotesData} from "./responseUtilities"
import DatabaseUtilities from "./databaseUtilities"
import {ReadableStream} from "stream/web"

export type UploadAttachmentResult = {
    url: string,
    type: string,
    subtype: string,
}

type FetchMemberOrUserOptions = {
    client: Client,
    guild?: GuildResolvable,
    user: UserResolvable,
    force?: boolean,
}

type PartialMessage = {
    embeds: Message["embeds"],
    components: APIActionRowComponent<APIButtonComponent | APISelectMenuComponent>[]
}

export default class InteractionUtilities {
    static async fetchMemberOrUser(options: Omit<FetchMemberOrUserOptions, "guild"> | (FetchMemberOrUserOptions & { guild: undefined }),
                                   force?: boolean): Promise<User>
    static async fetchMemberOrUser(options: FetchMemberOrUserOptions & { guild: GuildResolvable },
                                   force?: boolean): Promise<GuildMember>
    static async fetchMemberOrUser(options: FetchMemberOrUserOptions, force?: boolean): Promise<GuildMember | User>
    static async fetchMemberOrUser(options: FetchMemberOrUserOptions, force?: boolean): Promise<GuildMember | User> {
        const guild = options.guild ? await options.client.guilds.fetch({guild: options.guild}) : undefined
        if (!guild) {
            return await options.client.users.fetch(options.user, {force: force})
        }

        try {
            return await guild.members.fetch({
                user: options.user,
                force: force,
            })
        } catch (e) {
            if (!(e instanceof DiscordAPIError) || e.code !== RESTJSONErrorCodes.UnknownMember) {
                throw e
            }

            return await options.client.users.fetch(options.user)
        }
    }

    static getName(user: GuildMember | User): string {
        if (user instanceof GuildMember) {
            return `${user.user.tag}${user.nickname ? ` [${user.nickname}]` : ""}`
        }

        return user.tag
    }

    static getTag(user: GuildMember | User): string {
        if (user instanceof GuildMember) {
            return user.user.tag
        }

        return user.tag
    }

    static async uploadAttachment(attachment: Attachment): Promise<UploadAttachmentResult> {
        const mimeType = new MIMEType(attachment.contentType ?? "application/octet-stream")
        const file = StorageBucket.file(`${attachment.id}.${attachment.name?.split(".").pop() ?? "bin"}`)

        const response = await fetch(attachment.url)
        if (!response.body) {
            throw new Error("No response body")
        }

        // FIXME
        await pipeline(response.body as ReadableStream, file.createWriteStream())

        await file.makePublic()

        return {
            url: file.publicUrl(),
            type: mimeType.type,
            subtype: mimeType.subtype,
        }
    }

    static async generateNotesData(interaction: Interaction, user: UserResolvable): Promise<NotesData> {
        const data: NotesData = {
            user: await interaction.client.users.fetch(user),
            entry: await DatabaseUtilities.getEntry(user) ?? undefined,
            blocks: [],
        }

        if (data.entry) {
            for await (const block of DatabaseUtilities.getNotes(user)) {
                data.blocks.push(block)
            }
        }

        return data
    }

    static disable(message: PartialMessage): PartialMessage {
        return {
            embeds: message.embeds,
            components: message.components.map(row => {
                const builder = new ActionRowBuilder<MessageActionRowComponentBuilder>(row)
                builder.components.map(component => component.setDisabled(true))
                return builder.toJSON()
            }),
        }
    }
}