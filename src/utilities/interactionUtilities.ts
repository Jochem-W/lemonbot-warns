import {
    Attachment,
    Client,
    DiscordAPIError,
    GuildMember,
    GuildResolvable,
    Interaction,
    RESTJSONErrorCodes,
    User,
    UserResolvable,
} from "discord.js"
import {StorageBucket} from "../clients"
import {pipeline} from "stream/promises"
import MIMEType from "whatwg-mimetype"
import {NotesData} from "./responseUtilities"
import DatabaseUtilities from "./databaseUtilities"

export type UploadAttachmentResult = {
    url: string,
    type: string,
    subtype: string,
}

export type FetchMemberOrUserOptions = {
    guild?: GuildResolvable,
    client: Client,
    user: UserResolvable,
    force?: boolean,
}

export default class InteractionUtilities {
    // static async messageToPng(message: Message): Promise<string> {
    //     const magickExecutable = spawnSync("magick").error === undefined ? "magick" : "convert"
    //
    //     const response = await fetch(message.author.displayAvatarURL({size: 4096}))
    //     if (!response.body) {
    //         throw new Error("No response body")
    //     }
    //
    //     const avatarFile = message.author.id
    //     // @ts-ignore TODO: wait for @types/node update
    //     await pipeline(response.body, createWriteStream(avatarFile))
    //
    //     const date = DateTime.fromMillis(message.createdTimestamp).toRFC2822()
    //     const messageFile = `${message.id}.png`
    //     const spawnReturns = spawnSync(magickExecutable, ["-background", "#36393F", "-size", "512x", `pango:<span
    //          font_family=\"sans-serif\" foreground=\"#FFFFFF\" weight=\"500\"
    //          size=\"11264\">${message.author.username}</span> <span font_family=\"sans-serif\" foreground=\"#A3A6AA\"
    //          weight=\"500\" size=\"8448\">${date}</span>\n<span font_family=\"sans-serif\" foreground=\"#DCDDDE\"
    //          weight=\"400\" size=\"11264\">${message.content}</span>`, "-flatten", "-bordercolor", "#36393F",
    //         "-gravity", "West", "-splice", "56x0", "-border", "8", "-gravity", "NorthWest", "(", avatarFile,
    //         "-geometry", "40x40", "-gravity", "Center", "(", "-size", "40x40", "xc:Black", "-fill", "White", "-draw",
    //         "circle 20 20 20 39", "-alpha", "Copy", ")", "-compose", "CopyOpacity", "-composite", ")", "-compose",
    //         "Over", "-gravity", "NorthWest", "-geometry", "+8+8", "-composite", messageFile,
    //     ])
    //
    //     console.error(spawnReturns.stderr?.toString())
    //
    //     await unlink(avatarFile)
    //
    //     return messageFile
    // }

    static async fetchMemberOrUser(options: FetchMemberOrUserOptions, force?: boolean): Promise<GuildMember | User> {
        let guild = options.guild ? await options.client.guilds.fetch({guild: options.guild}) : undefined
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

        // @ts-ignore TODO: wait for @types/node update
        await pipeline(response.body, file.createWriteStream())

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
}