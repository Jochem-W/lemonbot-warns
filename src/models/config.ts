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

class Config {
    private readonly _bot: BotConfig
    private readonly _guild: GuildConfig
    private readonly _icons: IconsConfig
    private readonly _penalties: Penalty[]
    private readonly _repository: RepositoryConfig

    private constructor(data: RawConfig) {
        this._bot = new BotConfig(data.bot)
        this._guild = new GuildConfig(data.guild)
        this._icons = new IconsConfig(data.icons)
        this._penalties = data.penalties.map(penalty => {
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
        this._repository = new RepositoryConfig(data.repository)
    }

    public get bot(): BotConfig {
        return this._bot
    }

    public get guild(): GuildConfig {
        return this._guild
    }

    public get icons(): IconsConfig {
        return this._icons
    }

    public get penalties(): Penalty[] {
        return this._penalties
    }

    public get repository(): RepositoryConfig {
        return this._repository
    }

    public static loadSync() {
        return new Config(JSON.parse(readFileSync("config.json", "utf-8")) as RawConfig)
    }
}

export const DefaultConfig = Config.loadSync()
