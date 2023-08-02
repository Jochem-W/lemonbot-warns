import type { Penalty } from "@prisma/client"

export function comparePenalty(
  a: Penalty | null,
  b: Penalty | null,
  reverse = false,
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

  const nameComparison = a.name.localeCompare(b.name)

  if (a.ban && b.ban) {
    if (a.deleteMessages && b.deleteMessages) {
      return nameComparison
    }

    if (a.deleteMessages) {
      return aIsLarger
    }

    if (b.deleteMessages) {
      return bIsLarger
    }

    return nameComparison
  }

  if (a.ban) {
    return aIsLarger
  }

  if (b.ban) {
    return bIsLarger
  }

  if (a.timeout !== null && b.timeout !== null) {
    if (a.timeout > b.timeout) {
      return aIsLarger
    }

    if (a.timeout === b.timeout) {
      return nameComparison
    }

    return bIsLarger
  }

  if (a.timeout !== null) {
    return aIsLarger
  }

  if (b.timeout !== null) {
    return bIsLarger
  }

  if (a.kick && b.kick) {
    return nameComparison
  }

  if (a.kick) {
    return aIsLarger
  }

  if (b.kick) {
    return bIsLarger
  }

  return nameComparison
}

function assert(value: unknown) {
  if (!value) {
    throw new Error(value?.toString())
  }
}

function makePenalty(type: "ban" | "kick" | number | null) {
  return {
    id: 0,
    colour: "GREY" as const,
    name: "",
    ban: type === "ban",
    kick: type === "kick",
    timeout: typeof type === "number" ? type : null,
    deleteMessages: false,
    hidden: false,
  }
}

export function testComparePenalty() {
  assert(comparePenalty(null, null) === 0)
  assert(comparePenalty(null, makePenalty(null)) === -1)
  assert(comparePenalty(makePenalty(null), null) === 1)

  assert(
    comparePenalty(
      { ...makePenalty("ban"), deleteMessages: true },
      { ...makePenalty("ban"), deleteMessages: true },
    ) === 0,
  )
  assert(
    comparePenalty(
      { ...makePenalty("ban"), deleteMessages: false },
      { ...makePenalty("ban"), deleteMessages: true },
    ) === -1,
  )
  assert(
    comparePenalty(
      { ...makePenalty("ban"), deleteMessages: true },
      { ...makePenalty("ban"), deleteMessages: false },
    ) === 1,
  )

  assert(comparePenalty(makePenalty("ban"), makePenalty("ban")) === 0)
  assert(comparePenalty(makePenalty(0), makePenalty("ban")) === -1)
  assert(comparePenalty(makePenalty("kick"), makePenalty("ban")) === -1)
  assert(comparePenalty(makePenalty(null), makePenalty("ban")) === -1)
  assert(comparePenalty(makePenalty("ban"), makePenalty(0)) === 1)
  assert(comparePenalty(makePenalty("ban"), makePenalty("kick")) === 1)
  assert(comparePenalty(makePenalty("ban"), makePenalty(null)) === 1)

  assert(comparePenalty(makePenalty(0), makePenalty(0)) === 0)
  assert(comparePenalty(makePenalty(0), makePenalty(1)) === -1)
  assert(comparePenalty(makePenalty(1), makePenalty(0)) === 1)
  assert(comparePenalty(makePenalty("kick"), makePenalty(0)) === -1)
  assert(comparePenalty(makePenalty(null), makePenalty(0)) === -1)
  assert(comparePenalty(makePenalty(0), makePenalty("kick")) === 1)
  assert(comparePenalty(makePenalty(0), makePenalty(null)) === 1)

  assert(comparePenalty(makePenalty("kick"), makePenalty("kick")) === 0)
  assert(comparePenalty(makePenalty(null), makePenalty("kick")) === -1)
  assert(comparePenalty(makePenalty("kick"), makePenalty(null)) === 1)

  assert(comparePenalty(makePenalty(null), makePenalty(null)) === 0)
}
