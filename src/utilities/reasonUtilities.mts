import type { Reason } from "@prisma/client"

export function compareReason(
  a: Reason | null,
  b: Reason | null,
  reverse = true
) {
  const aIsLarger = reverse ? -1 : 1
  const bIsLarger = reverse ? 1 : -1

  if (a === null && b === null) {
    return 0
  }

  if (a === null) {
    return bIsLarger
  }

  if (b === null) {
    return aIsLarger
  }

  const aRuleMatch = a.name.match(/^R(\d+)\./)
  const bRuleMatch = b.name.match(/^R(\d+)\./)
  const stringComparison = a.name.localeCompare(b.name)

  if (aRuleMatch !== null && bRuleMatch !== null) {
    const ruleA = parseInt(aRuleMatch[1] ?? "0")
    const ruleB = parseInt(bRuleMatch[1] ?? "0")
    if (ruleA < ruleB) {
      return -1
    }

    if (ruleA > ruleB) {
      return 1
    }

    return stringComparison
  }

  if (aRuleMatch !== null) {
    return aIsLarger
  }

  if (bRuleMatch !== null) {
    return bIsLarger
  }

  return stringComparison
}

function assert(value: unknown) {
  if (!value) {
    throw new Error(value?.toString())
  }
}

function makeReason(name: string) {
  return {
    id: 0,
    colour: "GREY" as const,
    name,
  }
}

export function testCompareReason() {
  assert(compareReason(null, null) === 0)
  assert(compareReason(makeReason(""), null) === -1)
  assert(compareReason(null, makeReason("")) === 1)

  assert(compareReason(makeReason("R1."), makeReason("R1.")) === 0)
  assert(compareReason(makeReason(""), makeReason("R1.")) === 1)
  assert(compareReason(makeReason("R1."), makeReason("")) === -1)

  assert(compareReason(makeReason("R1."), makeReason("R2.")) === -1)
  assert(compareReason(makeReason("R2."), makeReason("R1.")) === 1)
}
