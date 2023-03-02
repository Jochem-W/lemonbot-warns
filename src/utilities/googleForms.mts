import { Forms } from "../clients.mjs"
import { InvalidFormResponseError } from "../errors.mjs"
import type { forms_v1 } from "@googleapis/forms"

export function getFirstTextAnswer(
  response: forms_v1.Schema$FormResponse,
  questionId: string
): string
export function getFirstTextAnswer(
  response: forms_v1.Schema$FormResponse,
  questionId: string,
  throwOnMissing: boolean
): string | null

export function getFirstTextAnswer(
  response: forms_v1.Schema$FormResponse,
  questionId: string,
  throwOnMissing?: boolean
) {
  if (!response.answers) {
    if (throwOnMissing) {
      throw new InvalidFormResponseError(response)
    }

    return null
  }

  const answer =
    response.answers[questionId]?.textAnswers?.answers?.at(0)?.value
  if (!answer && throwOnMissing !== false) {
    throw new InvalidFormResponseError(response)
  }

  return answer ?? null
}

export function getFormEditUrl(
  formId: string,
  responseId?: string | null | undefined
) {
  const url = new URL(`https://docs.google.com/forms/d/${formId}/edit`)
  if (responseId) {
    url.hash = `#response=${responseId}`
  }

  return url
}

export async function getFormResponderUri(formId: string) {
  const response = await Forms.forms.get({ formId })
  if (!response.data.responderUri) {
    throw new InvalidFormResponseError(response.data)
  }

  return response.data.responderUri
}
