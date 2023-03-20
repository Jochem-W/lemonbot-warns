import { Discord } from "../clients.mjs"
import { CheckBanAppealFormJob } from "../jobs/checkBanAppealFormJob.mjs"
import { DefaultConfig } from "../models/config.mjs"
import type { Handler } from "../types/handler.mjs"
import { fetchChannel } from "../utilities/discordUtilities.mjs"
import { makeEmbed } from "../utilities/embedUtilities.mjs"
import { Variables } from "../variables.mjs"
import { Octokit } from "@octokit/rest"
import { ChannelType, Client, codeBlock, userMention } from "discord.js"
import type { MessageCreateOptions } from "discord.js"
import { writeFileSync } from "fs"
import { mkdir, readFile, writeFile } from "fs/promises"

type State = "UP" | "DOWN" | "RECREATE"

export class ReadyHandler implements Handler<"ready"> {
  public readonly event = "ready"
  public readonly once = true

  public async handle(client: Client<true>) {
    console.log(`Running as: ${client.user.tag}`)

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

    const channel = await fetchChannel(
      DefaultConfig.guild.restart.channel,
      ChannelType.GuildText
    )

    const options: MessageCreateOptions = {
      embeds: [
        makeEmbed(
          title,
          DefaultConfig.icons.success,
          undefined,
          (await getChangelog()) ?? undefined
        ),
      ],
    }

    if (DefaultConfig.guild.restart.user) {
      options.content = userMention(DefaultConfig.guild.restart.user)
    }

    await channel.send(options)

    await setState("UP")
    await setVersion()

    process.on("SIGINT", () => process.exit())
    process.on("SIGTERM", () => process.exit())
    process.on("exit", () => {
      Discord.destroy()
      setStateSync("DOWN")
    })

    const job = await CheckBanAppealFormJob.create()
    job.start()
  }
}

async function getChangelog() {
  if (!Variables.commitHash) {
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

  // FIXME
  const octokit = new Octokit({ auth: Variables.githubToken })
  const response = await octokit.rest.repos.compareCommits({
    base: previousVersion.trim(),
    head: Variables.commitHash,
    owner: DefaultConfig.repository.owner,
    repo: DefaultConfig.repository.name,
  })

  let description = `${previousVersion.slice(
    0,
    7
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
      namePad
    )} | ${file.additions.padStart(additionsPad)}+ ${file.deletions.padStart(
      deletionsPad
    )}-`
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
  potentialObject: unknown
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

function setStateSync(status: State) {
  writeFileSync("status", status, { encoding: "utf8" })
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
