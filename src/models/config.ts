import {Duration} from "luxon"
import {Snowflake} from "discord.js"
import {readFileSync} from "fs"

export type Penalty = {
    name: string
    value: null | Duration | "ban" | "kick"
}

type ConfigData = {
    warnIcon: string
    successIcon: string
    failIcon: string
    guildId: string
    privateChannels: string[]
    cacheTtl: number
    warnCategory: string
    restartChannel: string
    restartUser: string
    penalties: ({ name: string } & ({ timeout: number } | { ban: true } | { kick: true } | { noPenalty: true }))[]
    discordApplicationId: string
    warnLogsChannel: string
}

export abstract class Config {
    private static _warnIcon: URL

    // Icon that is used when someone is warned
    public static get warnIcon(): URL {
        return Config._warnIcon
    }

    private static _successIcon: URL

    // Icon that is used on success
    public static get successIcon(): URL {
        return Config._successIcon
    }

    private static _failIcon: URL

    // Icon that is used on fail
    public static get failIcon(): URL {
        return Config._failIcon
    }

    private static _guildId: Snowflake

    // Guild to enable the bot on
    public static get guildId(): Snowflake {
        return Config._guildId
    }

    private static _privateChannels: Snowflake[]

    // Channels that show non-ephemeral replies
    public static get privateChannels(): Snowflake[] {
        return Config._privateChannels
    }

    private static _cacheTtl: Duration

    // Time in milliseconds to cache database data
    public static get cacheTtl(): Duration {
        return Config._cacheTtl
    }

    private static _warnCategory: Snowflake

    // The category under which to create a channel to warn someone
    public static get warnCategory(): Snowflake {
        return Config._warnCategory
    }

    private static _restartChannel: Snowflake

    // The channel to send restart notifications to
    public static get restartChannel(): Snowflake {
        return Config._restartChannel
    }

    private static _restartUser: Snowflake

    // The user to mention when sending a restart notification
    public static get restartUser(): Snowflake {
        return Config._restartUser
    }

    private static _penalties: Penalty[]

    // List of penalties
    public static get penalties(): Penalty[] {
        return Config._penalties
    }

    private static _discordApplicationId: Snowflake

    // Discord Application ID
    public static get discordApplicationId(): Snowflake {
        return Config._discordApplicationId
    }

    private static _warnLogsChannel: Snowflake

    // Warn logs channel
    public static get warnLogsChannel(): Snowflake {
        return Config._warnLogsChannel
    }

    public static load() {
        const data: ConfigData = JSON.parse(readFileSync("config.json", "utf-8"))
        Config._warnIcon = new URL(data.warnIcon)
        Config._successIcon = new URL(data.successIcon)
        Config._failIcon = new URL(data.failIcon)
        Config._guildId = data.guildId
        Config._privateChannels = [...data.privateChannels]
        Config._cacheTtl = Duration.fromMillis(data.cacheTtl)
        Config._warnCategory = data.warnCategory
        Config._restartChannel = data.restartChannel
        Config._restartUser = data.restartUser
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
        Config._discordApplicationId = data.discordApplicationId
        Config._warnLogsChannel = data.warnLogsChannel
    }
}

Config.load()
