import {Duration} from "luxon"
import {Snowflake} from "discord.js"

export type Penalty = {
    name: string
    penalty: null | Duration | "ban"
}

export default abstract class Config {
    // Icon that is used when someone is warned
    public static readonly warnIcon: string = "CHANGE_ME"

    // Icon that is used on success
    public static readonly successIcon: string = "CHANGE_ME"

    // Icon that is used on fail
    public static readonly failIcon: string = "CHANGE_ME"

    // Guild to enable the bot on
    public static readonly guildId: Snowflake = "CHANGE_ME"

    // Channels that show non-ephemeral replies
    public static readonly privateChannels: Snowflake[] = ["CHANGE_ME"]

    // Time in milliseconds to cache database data
    public static readonly cacheTtl: Duration = Duration.fromMillis(0)

    // The category under which to create a channel to warn someone
    public static readonly warnCategory: Snowflake = "CHANGE_ME"

    // The channel to send message reports to
    public static readonly reportChannel: Snowflake = "CHANGE_ME"

    // The channel to send restart notifications to
    public static readonly restartChannel: Snowflake = "CHANGE_ME"

    // The user to mention when sending a restart notification
    public static readonly restartUser: Snowflake = "CHANGE_ME"

    // List of penalties
    public static readonly penalties: Penalty[] = [
        {
            name: "CHANGE_ME",
            penalty: null,
        },
    ]
}