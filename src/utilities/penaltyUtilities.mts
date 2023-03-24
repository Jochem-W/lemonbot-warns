import type { Penalty } from "@prisma/client"

export function comparePenalty(a: Penalty | null, b: Penalty | null) {
  if (a === null && b === null) {
    return 0
  }

  if (a === null) {
    return 1
  }

  if (b === null) {
    return -1
  }

  if (a.ban && b.ban) {
    return 0
  }

  if (a.ban) {
    return -1
  }

  if (b.ban) {
    return 1
  }

  if (a.timeout !== null && b.timeout !== null) {
    if (a.timeout > b.timeout) {
      return -1
    }

    if (a.timeout === b.timeout) {
      return 0
    }

    return 1
  }

  if (a.timeout !== null) {
    return -1
  }

  if (b.timeout !== null) {
    return 1
  }

  if (a.kick && b.kick) {
    return 0
  }

  if (a.kick) {
    return -1
  }

  if (b.kick) {
    return 1
  }

  return 0
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
  }
}

export function testComparePenalty() {
  assert(comparePenalty(null, null) === 0)
  assert(comparePenalty(null, makePenalty(null)) === 1)
  assert(comparePenalty(makePenalty(null), null) === -1)

  assert(comparePenalty(makePenalty("ban"), makePenalty("ban")) === 0)
  assert(comparePenalty(makePenalty(0), makePenalty("ban")) === 1)
  assert(comparePenalty(makePenalty("kick"), makePenalty("ban")) === 1)
  assert(comparePenalty(makePenalty(null), makePenalty("ban")) === 1)
  assert(comparePenalty(makePenalty("ban"), makePenalty(0)) === -1)
  assert(comparePenalty(makePenalty("ban"), makePenalty("kick")) === -1)
  assert(comparePenalty(makePenalty("ban"), makePenalty(null)) === -1)

  assert(comparePenalty(makePenalty(0), makePenalty(0)) === 0)
  assert(comparePenalty(makePenalty(0), makePenalty(1)) === 1)
  assert(comparePenalty(makePenalty(1), makePenalty(0)) === -1)
  assert(comparePenalty(makePenalty("kick"), makePenalty(0)) === 1)
  assert(comparePenalty(makePenalty(null), makePenalty(0)) === 1)
  assert(comparePenalty(makePenalty(0), makePenalty("kick")) === -1)
  assert(comparePenalty(makePenalty(0), makePenalty(null)) === -1)

  assert(comparePenalty(makePenalty("kick"), makePenalty("kick")) === 0)
  assert(comparePenalty(makePenalty(null), makePenalty("kick")) === 1)
  assert(comparePenalty(makePenalty("kick"), makePenalty(null)) === -1)

  assert(comparePenalty(makePenalty(null), makePenalty(null)) === 0)
}
