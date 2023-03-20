import { DuplicateNameError, UnregisteredNameError } from "../errors.mjs"
import { RegisteredModals } from "../interactable.mjs"
import { customIdToString, InteractionScope } from "../models/customId.mjs"
import { ModalSubmitInteraction } from "discord.js"

export type ModalHandler = (
  interaction: ModalSubmitInteraction,
  args: string[]
) => Promise<void>
export type RegisteredModalHandler = {
  type: "modal"
  name: string
}

export function registerModalHandler(name: string, handler: ModalHandler) {
  if (RegisteredModals.has(name)) {
    throw new DuplicateNameError("modal", name)
  }

  RegisteredModals.set(name, handler)
  return { type: "modal" as const, name }
}

export function modal(handler: RegisteredModalHandler, args: string[]) {
  if (!RegisteredModals.has(handler.name)) {
    throw new UnregisteredNameError("modal", handler.name)
  }

  return customIdToString({
    name: handler.name,
    args,
    scope: InteractionScope.Modal,
  })
}
