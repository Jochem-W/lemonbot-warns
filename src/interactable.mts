import { EditWarnButton } from "./buttons/editWarnButton.mjs"
import { EditWarnModal } from "./modals/editWarnModal.mjs"
import type { Button } from "./types/button.mjs"
import type { Modal } from "./types/modal.mjs"

export const Buttons: Button[] = [new EditWarnButton()]
export const Modals: Modal[] = [new EditWarnModal()]

export const RegisteredButtons = new Map<string, Button>()
export const RegisteredModals = new Map<string, Modal>()
