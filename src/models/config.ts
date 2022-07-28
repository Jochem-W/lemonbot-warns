import {Duration} from "luxon"
import {Snowflake} from "discord.js"
import {readFileSync} from "fs"

export interface Penalty {
    name: string
    value: null | Duration | "ban" | "kick"
}

interface RawConfig {
    bot: {
        applicationId: string
        cacheTtl: number
    }
    guild: {
        errorChannel: string
        id: string
        privateChannels: string[]
        restart: {
            channel: string
            user: string
        }
        warnCategory: string
        warnLogsChannel: string
    }
    icons: {
        fail: string
        success: string
        warning: string
    }
    penalties: ({ name: string } & ({ timeout: number } | { ban: true } | { kick: true } | { noPenalty: true }))[]
    repository: {
        name: string
        owner: string
    }
}

class BotConfig {
    public readonly applicationId: Snowflake
    public readonly cacheTtl: Duration

    public constructor(data: RawConfig["bot"]) {
        this.applicationId = data.applicationId
        this.cacheTtl = Duration.fromObject({seconds: data.cacheTtl})
    }
}

class GuildConfig {
    public readonly errorChannel: Snowflake
    public readonly id: Snowflake
    public readonly privateChannels: Snowflake[]
    public readonly restart: GuildRestartConfig
    public readonly warnCategory: Snowflake
    public readonly warnLogsChannel: Snowflake

    public constructor(data: RawConfig["guild"]) {
        this.errorChannel = data.errorChannel
        this.id = data.id
        this.privateChannels = [...data.privateChannels]
        this.restart = new GuildRestartConfig(data.restart)
        this.warnCategory = data.warnCategory
        this.warnLogsChannel = data.warnLogsChannel
    }
}

class GuildRestartConfig {
    public readonly channel: Snowflake
    public readonly user: Snowflake

    public constructor(data: RawConfig["guild"]["restart"]) {
        this.channel = data.channel
        this.user = data.user
    }
}

class IconsConfig {
    public readonly fail: URL
    public readonly success: URL
    public readonly warning: URL

    public constructor(data: RawConfig["icons"]) {
        this.fail = new URL(data.fail)
        this.success = new URL(data.success)
        this.warning = new URL(data.warning)
    }
}

class RepositoryConfig {
    public readonly name: string
    public readonly owner: string

    public constructor(data: RawConfig["repository"]) {
        this.name = data.name
        this.owner = data.owner
    }
}

export abstract class Config {
    private static _bot: BotConfig

    public static get bot(): BotConfig {
        return Config._bot
    }

    private static _guild: GuildConfig

    public static get guild(): GuildConfig {
        return Config._guild
    }

    private static _icons: IconsConfig

    public static get icons(): IconsConfig {
        return Config._icons
    }

    private static _penalties: Penalty[]

    public static get penalties(): Penalty[] {
        return Config._penalties
    }

    private static _repository: RepositoryConfig

    public static get repository(): RepositoryConfig {
        return Config._repository
    }

    public static loadSync() {
        const data = JSON.parse(readFileSync("config.json", "utf-8")) as RawConfig
        Config._bot = new BotConfig(data.bot)
        Config._guild = new GuildConfig(data.guild)
        Config._icons = new IconsConfig(data.icons)
        Config._penalties = data.penalties.map(penalty => {
            if ("timeout" in penalty) {
                return {
                    name: penalty.name,
                    value: Duration.fromObject(Object.fromEntries(Object.entries(Duration.fromMillis(penalty.timeout)
                        .shiftTo("weeks", "days", "hours", "minutes", "seconds", "milliseconds")
                        .normalize()
                        .toObject())
                        .filter(([, value]) => value !== 0))),
                }
            }

            if ("ban" in penalty) {
                return {
                    name: penalty.name,
                    value: "ban",
                }
            }

            if ("kick" in penalty) {
                return {
                    name: penalty.name,
                    value: "kick",
                }
            }

            return {
                name: penalty.name,
                value: null,
            }
        })
        Config._repository = new RepositoryConfig(data.repository)
    }
}

Config.loadSync()
