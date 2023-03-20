import { InvalidCustomIdError } from "../errors.mjs"

export type CustomId = {
  scope: InteractionScope
  name: string
  args: string[]
}

type InteractionScope = "b" | "c" | "m"
export const InteractionScope = {
  get Button() {
    return "b" as const
  },
  get Collector() {
    return "c" as const
  },
  get Modal() {
    return "m" as const
  },
}

export function stringToCustomId(data: string) {
  const [scope, name, ...args] = data.split(":")
  if (name === undefined) {
    throw new InvalidCustomIdError(data)
  }

  if (
    scope !== InteractionScope.Button &&
    scope !== InteractionScope.Modal &&
    scope !== InteractionScope.Collector
  ) {
    throw new InvalidCustomIdError(data)
  }

  return {
    scope,
    name,
    args,
  }
}

export function customIdToString(
  data: Omit<CustomId, "args"> & { args?: string[] }
) {
  return `${data.scope}:${data.name}:${data.args?.join(":") ?? ""}`
}
