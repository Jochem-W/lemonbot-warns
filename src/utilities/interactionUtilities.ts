import {
    ActionRowBuilder,
    Attachment,
    Client,
    DiscordAPIError,
    GuildMember,
    GuildResolvable,
    Interaction,
    MessageActionRowComponentBuilder,
    MessageEditOptions,
    RESTJSONErrorCodes,
    Team,
    User,
    UserResolvable,
    WebhookEditMessageOptions,
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

type FetchUserOptions = {
    client: Client,
    user: UserResolvable,
    force?: boolean,
}

type FetchMemberOptions = FetchUserOptions & { guild: GuildResolvable }

export default class InteractionUtilities {
    static async fetchMemberOrUser(options: FetchUserOptions): Promise<User>
    static async fetchMemberOrUser(options: FetchMemberOptions): Promise<GuildMember>
    static async fetchMemberOrUser(options: FetchUserOptions | FetchMemberOptions): Promise<GuildMember | User>
    static async fetchMemberOrUser(options: FetchUserOptions | FetchMemberOptions): Promise<GuildMember | User> {
        const guild = "guild" in options ? await options.client.guilds.fetch({guild: options.guild}) : undefined
        if (!guild) {
            return await options.client.users.fetch(options.user, {force: options.force})
        }

        try {
            return await guild.members.fetch({
                user: options.user,
                force: options.force,
            })
        } catch (e) {
            if (!(e instanceof DiscordAPIError) || e.code !== RESTJSONErrorCodes.UnknownMember) {
                throw e
            }

            return await options.client.users.fetch(options.user)
        }
    }

    static async checkOwner(interaction: Interaction): Promise<boolean> {
        if (!interaction.client.application) {
            return false
        }

        await interaction.client.application.fetch()
        return interaction.client.application.owner instanceof Team ?
            interaction.client.application.owner.members.has(interaction.user.id) :
            interaction.client.application.owner === interaction.user

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

    static disable<T extends WebhookEditMessageOptions | MessageEditOptions>(message: T): T {
        return {
            ...message,
            components: message.components?.map(row => {
                let builder: ActionRowBuilder<MessageActionRowComponentBuilder>
                if ("toJSON" in row) {
                    builder = new ActionRowBuilder<MessageActionRowComponentBuilder>(row.toJSON())
                } else {
                    builder = new ActionRowBuilder<MessageActionRowComponentBuilder>(row)
                }

                builder.components.map(component => component.setDisabled(true))

                return builder.toJSON()
            }),
        }
    }
}