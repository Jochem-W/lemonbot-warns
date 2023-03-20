import { DuplicateNameError, UnregisteredNameError } from "../errors.mjs"
import { RegisteredButtons } from "../interactable.mjs"
import { customIdToString, InteractionScope } from "../models/customId.mjs"
import { ButtonInteraction } from "discord.js"

export type ButtonHandler = (
  interaction: ButtonInteraction,
  args: string[]
) => Promise<void>
export type RegisteredButtonHandler = {
  type: "button"
  name: string
}

export function registerButtonHandler(name: string, handler: ButtonHandler) {
  if (RegisteredButtons.has(name)) {
    throw new DuplicateNameError("button", name)
  }

  RegisteredButtons.set(name, handler)
  return { type: "button" as const, name }
}

export function button(handler: RegisteredButtonHandler, args: string[]) {
  if (!RegisteredButtons.has(handler.name)) {
    throw new UnregisteredNameError("button", handler.name)
  }

  return customIdToString({
    name: handler.name,
    args,
    scope: InteractionScope.Button,
  })
}
