import type { Snowflake } from "discord.js"
import { DateTime } from "luxon"

export function snowflakeToDateTime(snowflake: Snowflake) {
  return DateTime.fromMillis(
    Number((BigInt(snowflake) >> 22n) + 1420070400000n),
    { zone: "utc" }
  )
}
