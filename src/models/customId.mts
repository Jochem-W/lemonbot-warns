import { InvalidCustomIdError } from "../errors.mjs"

export type CustomId = {
  scope: InteractionScope
  primary: string
  secondary?: string
  tertiary?: string[]
}

type InteractionScope = "i" | "c" | "b" | "m"
export const InteractionScope = {
  get Instance() {
    return "i" as const
  },
  get Collector() {
    return "c" as const
  },
  get Button() {
    return "b" as const
  },
  get Modal() {
    return "m" as const
  },
}

export function stringToCustomId(data: string) {
  const [scope, primary, secondary, ...tertiary] = data.split(":")
  if (scope === undefined || primary === undefined || secondary === undefined) {
    throw new InvalidCustomIdError(data)
  }

  return {
    scope,
    primary,
    secondary,
    tertiary,
  } as CustomId
}

export function customIdToString(data: CustomId) {
  return `${data.scope}:${data.primary}:${data.secondary ?? ""}:${
    data.tertiary?.join(":") ?? ""
  }`
}
