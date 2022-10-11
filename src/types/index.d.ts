/* eslint-disable no-var */

declare global {
    var fetch: typeof import("undici").fetch
}

export {}