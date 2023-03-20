import type { ButtonHandler } from "./utilities/button.mjs"
import type { ModalHandler } from "./utilities/modal.mjs"

export const RegisteredButtons = new Map<string, ButtonHandler>()
export const RegisteredModals = new Map<string, ModalHandler>()
