import { GitHubClient, Prisma } from "../clients.mjs"
import { Config } from "../models/config.mjs"
import { handler } from "../models/handler.mjs"
import { fetchChannel, uniqueName } from "../utilities/discordUtilities.mjs"
import { Variables } from "../variables.mjs"
import { ChannelType, Client, codeBlock, EmbedBuilder } from "discord.js"
import { mkdir, readFile, writeFile } from "fs/promises"

type State = "UP" | "DOWN" | "RECREATE"

export const StartupHandler = handler({
  event: "ready",
  once: true,
  async handle(client) {
    console.log(`Running as: ${uniqueName(client.user)}`)

    let title = "Bot "
    switch (await getState()) {
      case "UP":
        title += "crashed"
        break
      case "DOWN":
        title += "restarted"
        break
      case "RECREATE":
        title += "redeployed"
        break
    }

    const guilds = await Prisma.warningGuild.findMany()
    const message = {
      embeds: [
        new EmbedBuilder().setTitle(title).setDescription(await getChangelog()),
      ],
    }
    for (const guild of guilds) {
      if (!guild.restartChannel) {
        continue
      }

      const channel = await fetchChannel(
        client,
        guild.restartChannel,
        ChannelType.GuildText,
      )
      await channel.send(message)
    }

    await setState("UP")
    await setVersion()

    process.on("SIGINT", () => exitListener(client))
    process.on("SIGTERM", () => exitListener(client))
  },
})

function exitListener(client: Client<true>) {
  client
    .destroy()
    .then(() => setState("DOWN"))
    .then(() => process.exit())
    .catch(console.error)
}

async function getChangelog() {
  if (!Variables.commitHash || !Variables.githubToken || !Config.repository) {
    return null
  }

  let previousVersion
  try {
    previousVersion = await readFile("persisted/bot/version", {
      encoding: "utf8",
    })
  } catch (e) {
    if (!isErrnoException(e) || e.code !== "ENOENT") {
      throw e
    }

    return null
  }

  if (previousVersion === Variables.commitHash) {
    return null
  }

  const response = await GitHubClient.rest.repos.compareCommits({
    base: previousVersion.trim(),
    head: Variables.commitHash,
    owner: Config.repository.owner,
    repo: Config.repository.name,
  })

  let description = `${previousVersion.slice(
    0,
    7,
  )}..${Variables.commitHash.slice(0, 7)}\n\ncommit log:`
  response.data.commits.reverse()
  for (const commit of response.data.commits) {
    description += `\n  ${commit.sha.slice(0, 7)}`
    const message = commit.commit.message.split("\n")[0]
    if (message) {
      description += ` ${message}`
    }
  }

  description += "\n\nchanges:"

  let namePad = 0
  let additionsPad = 0
  let deletionsPad = 0
  const files: { name: string; additions: string; deletions: string }[] = []
  if (response.data.files) {
    response.data.files.sort((a, b) => a.filename.localeCompare(b.filename))
    for (const rawFile of response.data.files) {
      const file = {
        name: rawFile.filename,
        additions: rawFile.additions.toString(),
        deletions: rawFile.deletions.toString(),
      }
      files.push(file)
      namePad = Math.max(namePad, file.name.length)
      additionsPad = Math.max(additionsPad, file.additions.length)
      deletionsPad = Math.max(deletionsPad, file.deletions.length)
    }
  }

  for (const file of files) {
    description += `\n  ${file.name.padEnd(
      namePad,
    )} | ${file.additions.padStart(additionsPad)}+ ${file.deletions.padStart(
      deletionsPad,
    )}-`
  }

  if (description.length > 4000) {
    description = description.substring(0, 4000) + "…"
  }

  return codeBlock(description)
}

type ArbitraryObject = Record<string, unknown>

function isErrnoException(error: unknown): error is NodeJS.ErrnoException {
  return (
    isArbitraryObject(error) &&
    error instanceof Error &&
    (typeof error["errno"] === "number" ||
      typeof error["errno"] === "undefined") &&
    (typeof error["code"] === "string" ||
      typeof error["code"] === "undefined") &&
    (typeof error["path"] === "string" ||
      typeof error["path"] === "undefined") &&
    (typeof error["syscall"] === "string" ||
      typeof error["syscall"] === "undefined")
  )
}

function isArbitraryObject(
  potentialObject: unknown,
): potentialObject is ArbitraryObject {
  return typeof potentialObject === "object" && potentialObject !== null
}

async function setVersion() {
  if (!Variables.commitHash) {
    return
  }

  try {
    await mkdir("persisted", { recursive: true })
  } catch (e) {
    if (!isErrnoException(e) || e.code !== "EEXIST") {
      throw e
    }
  }

  await writeFile("persisted/bot/version", Variables.commitHash, {
    encoding: "utf8",
  })
}

async function setState(status: State) {
  await writeFile("status", status, { encoding: "utf8" })
}

async function getState() {
  try {
    const state = await readFile("status", "utf8")
    if (state !== "UP" && state !== "DOWN" && state !== "RECREATE") {
      return "RECREATE"
    }

    return state
  } catch (e) {
    if (!isErrnoException(e) || e.code !== "ENOENT") {
      throw e
    }

    return "RECREATE"
  }
}
