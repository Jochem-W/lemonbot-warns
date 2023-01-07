import { InvalidCustomIdError } from "../errors.mjs"

type InteractionScope = "i" | "c"
export const InteractionScope = {
  get Instance(): InteractionScope {
    return "i"
  },
  get Collector(): InteractionScope {
    return "c"
  },
}

export class CustomId {
  public scope: InteractionScope
  public primary: string
  public secondary: string
  public tertiary: string[]

  public constructor(
    scope: InteractionScope,
    primary: string,
    secondary: string,
    tertiary: string[]
  ) {
    this.scope = scope
    this.primary = primary
    this.secondary = secondary
    this.tertiary = tertiary
  }

  public static fromString(data: string): CustomId {
    const [scope, primary, secondary, ...tertiary] = data.split(":")
    if (
      scope === undefined ||
      primary === undefined ||
      secondary === undefined
    ) {
      throw new InvalidCustomIdError(data)
    }

    return new CustomId(scope as InteractionScope, primary, secondary, tertiary)
  }

  public toString(): string {
    return `${this.scope}:${this.primary}:${
      this.secondary
    }:${this.tertiary.join(":")}`
  }
}
