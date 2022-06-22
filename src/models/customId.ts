export function customId(data: CustomId) {
    return `${data.scope}:${data.primary}:${data.secondary}:${data.tertiary.join(":")}`
}

export function parseCustomId(customId: string): CustomId {
    const [scope, primary, secondary, ...tertiary] = customId.split(":")
    if (scope == undefined || primary == undefined || secondary == undefined) {
        throw new Error(`Invalid customId: ${customId}`)
    }

    return {
        scope: scope as InteractionScope,
        primary,
        secondary,
        tertiary,
    }
}

export type CustomId = {
    scope: InteractionScope
    primary: string
    secondary: string
    tertiary: string[]
}

type InteractionScope = "g" | "l" | "c";
export const InteractionScope = {
    get Local(): InteractionScope {
        return "l"
    },
    get Collector(): InteractionScope {
        return "c"
    },
}