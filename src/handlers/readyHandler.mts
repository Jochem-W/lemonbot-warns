import {
  ChannelType,
  Client,
  codeBlock,
  MessageCreateOptions,
  userMention,
} from "discord.js"
import { mkdir, readFile, writeFile } from "fs/promises"
import { DefaultConfig } from "../models/config.mjs"
import type { Handler } from "../interfaces/handler.mjs"
import { writeFileSync } from "fs"
import { Variables } from "../variables.mjs"
import { makeEmbed } from "../utilities/responseBuilder.mjs"
import { Octokit } from "@octokit/rest"
import { fetchChannel } from "../utilities/discordUtilities.mjs"

type State = "UP" | "DOWN" | "RECREATE"

export class ReadyHandler implements Handler<"ready"> {
  public readonly event = "ready"
  public readonly once = true

  public async handle(client: Client<true>): Promise<void> {
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
      client,
      DefaultConfig.guild.restart.channel,
      ChannelType.GuildText
    )

    const options: MessageCreateOptions = {
      embeds: [makeEmbed(title).setDescription(await getChangelog())],
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
      client.destroy()
      setStateSync("DOWN")
    })
  }
}

async function getChangelog(): Promise<string | null> {
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

async function setVersion(): Promise<void> {
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

async function setState(status: State): Promise<void> {
  await writeFile("status", status, { encoding: "utf8" })
}

function setStateSync(status: State): void {
  writeFileSync("status", status, { encoding: "utf8" })
}

async function getState(): Promise<State> {
  try {
    return (await readFile("status", "utf8")) as State
  } catch (e) {
    if (!isErrnoException(e) || e.code !== "ENOENT") {
      throw e
    }

    return "RECREATE"
  }
}