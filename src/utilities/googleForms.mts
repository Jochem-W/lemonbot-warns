import { InvalidFormResponseError } from "../errors.mjs"
import { Google } from "../clients.mjs"

export interface FormsGet {
  formId: string
  info: object
  settings: object
  revisionId: string
  responderUri: string
  items: object[]
}

export interface FormsResponsesList {
  responses?: FormResponse[]
}

export interface FormResponse {
  responseId: string
  lastSubmittedTime: string
  answers: Record<
    string,
    {
      questionId: string
      textAnswers: {
        answers: {
          value: string
        }[]
      }
    }
  >
}

export function getFirstTextAnswer(response: FormResponse, questionId: string): string
export function getFirstTextAnswer(
  response: FormResponse,
  questionId: string,
  throwOnMissing: boolean
): string | null

export function getFirstTextAnswer(
  response: FormResponse,
  questionId: string,
  throwOnMissing?: boolean
) {
  const answer = response.answers[questionId]?.textAnswers.answers.at(0)?.value
  if (!answer && throwOnMissing !== false) {
    throw new InvalidFormResponseError(response)
  }

  return answer ?? null
}

export function getFormEditUrl(formId: string): URL
export function getFormEditUrl(formId: string, responseId: string): URL
export function getFormEditUrl(formId: string, responseId?: string) {
  const url = new URL(`https://docs.google.com/forms/d/${formId}/edit`)
  if (responseId) {
    url.hash = `#response=${responseId}`
  }

  return url
}

export async function getFormResponderUri(formId: string) {
  const response = await Google.request<FormsGet>({
    url: `https://forms.googleapis.com/v1/forms/${formId}`,
  })

  return response.data.responderUri
}
