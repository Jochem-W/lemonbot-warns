import { InvalidFormResponseError } from "../errors.mjs"

export interface FormResponsesList {
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

export function getFirstTextAnswer(
  response: FormResponse,
  questionId: string,
  throwOnMissing?: true
): string
export function getFirstTextAnswer(
  response: FormResponse,
  questionId: string,
  throwOnMissing: false
): string | null

export function getFirstTextAnswer(
  response: FormResponse,
  questionId: string,
  throwOnMissing?: boolean
) {
  console.log(throwOnMissing)
  const answer = response.answers[questionId]?.textAnswers.answers.at(0)?.value
  if (!answer && throwOnMissing !== false) {
    throw new InvalidFormResponseError(response)
  }

  return answer ?? null
}

export function getFormEditUrl(formId: string) {
  return new URL(`https://docs.google.com/forms/d/${formId}/edit`)
}

export function getFormResponseUrl(formId: string, responseId: string) {
  return new URL(
    `https://docs.google.com/forms/d/${formId}/edit#response=${responseId}`
  )
}

export function getFormViewUrl(formId: string) {
  return new URL(
    `https://docs.google.com/forms/d/e/${formId}/viewform?usp=sf_link`
  )
}
