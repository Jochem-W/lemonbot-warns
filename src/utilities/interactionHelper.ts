import {Client, Constants, DiscordAPIError, Guild, GuildMember, Message, User, UserResolvable} from "discord.js"
import {createWriteStream} from "fs"
import {unlink} from "fs/promises"
import {spawnSync} from "child_process"
import {DateTime} from "luxon"
import fetch from "node-fetch"

export default class InteractionHelper {
    static async messageToPng(message: Message): Promise<string> {
        const magickExecutable = spawnSync("magick").error === undefined ? "magick" : "convert"

        // TODO: update @types/node and switch to fetch
        const response = await fetch(message.author.displayAvatarURL({size: 4096}))
        if (!response.body) {
            throw new Error("No response body")
        }

        const avatarFile = message.author.id
        const fileStream = createWriteStream(avatarFile)
        await new Promise((resolve, reject) => {
            response.body?.pipe(fileStream)
            response.body?.on("error", reject)
            fileStream.on("finish", resolve)
        })

        const date = DateTime.fromMillis(message.createdTimestamp).toRFC2822()
        const messageFile = `${message.id}.png`
        const spawnReturns = spawnSync(magickExecutable, ["-background", "#36393F", "-size", "512x", `pango:<span
             font_family=\"sans-serif\" foreground=\"#FFFFFF\" weight=\"500\"
             size=\"11264\">${message.author.username}</span> <span font_family=\"sans-serif\" foreground=\"#A3A6AA\"
             weight=\"500\" size=\"8448\">${date}</span>\n<span font_family=\"sans-serif\" foreground=\"#DCDDDE\"
             weight=\"400\" size=\"11264\">${message.content}</span>`, "-flatten", "-bordercolor", "#36393F",
            "-gravity", "West", "-splice", "56x0", "-border", "8", "-gravity", "NorthWest", "(", avatarFile,
            "-geometry", "40x40", "-gravity", "Center", "(", "-size", "40x40", "xc:Black", "-fill", "White", "-draw",
            "circle 20 20 20 39", "-alpha", "Copy", ")", "-compose", "CopyOpacity", "-composite", ")", "-compose",
            "Over", "-gravity", "NorthWest", "-geometry", "+8+8", "-composite", messageFile,
        ])

        console.error(spawnReturns.stderr?.toString())

        await unlink(avatarFile)

        return messageFile
    }

    static async fetchMemberOrUser(client: Client,
                                   guild: Guild,
                                   user: UserResolvable,
                                   force?: boolean): Promise<GuildMember | User> {
        try {
            return await guild.members.fetch({user: user, force: force})
        } catch (e) {
            if ((e as DiscordAPIError).code !== Constants.APIErrors.UNKNOWN_MEMBER) {
                throw e
            }
        }

        return await client.users.fetch(user, {force: force})
    }

    static getName(user: UserResolvable) {
        if (user instanceof GuildMember) {
            return `${user.user.tag}${user.nickname ? ` (${user.nickname})` : ""}`
        }

        if (user instanceof User) {
            return user.tag
        }

        throw new Error("Unsupported user type")
    }

    static getTag(user: UserResolvable) {
        if (user instanceof GuildMember) {
            return user.user.tag
        }

        if (user instanceof User) {
            return user.tag
        }

        throw new Error("Unsupported user type")
    }
}