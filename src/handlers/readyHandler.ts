import {ChannelType, Client, codeBlock, userMention} from "discord.js"
import {mkdir, readFile, writeFile} from "fs/promises"
import {DefaultConfig} from "../models/config"
import type {Handler} from "../interfaces/handler"
import {ChannelNotFoundError, InvalidChannelTypeError} from "../errors"
import {writeFileSync} from "fs"
import {Variables} from "../variables"
import {makeEmbed} from "../utilities/responseBuilder"
import {Octokit} from "@octokit/rest"

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

        const channel = await client.channels.fetch(DefaultConfig.guild.restart.channel)
        if (!channel) {
            throw new ChannelNotFoundError(DefaultConfig.guild.restart.channel)
        }

        if (channel.type !== ChannelType.GuildText) {
            throw new InvalidChannelTypeError(channel, ChannelType.GuildText)
        }

        await channel.send({
            content: DefaultConfig.guild.restart.user ? userMention(DefaultConfig.guild.restart.user) : undefined,
            embeds: [makeEmbed(title).setDescription(await getChangelog())],
        })

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
        previousVersion = await readFile("persisted/version", {encoding: "utf8"})
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
    const octokit = new Octokit({auth: Variables.githubToken})
    const response = await octokit.rest.repos.compareCommits({
        base: previousVersion.trim(),
        head: Variables.commitHash,
        owner: DefaultConfig.repository.owner,
        repo: DefaultConfig.repository.name,
    })

    let description = `${previousVersion.slice(0, 7)}..${Variables.commitHash.slice(0, 7)}\n\ncommit log:`
    response.data.commits.reverse()
    for (const commit of response.data.commits) {
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        description += `\n  ${commit.sha.slice(0, 7)} ${commit.commit.message.split("\n")[0]}`
    }

    description += "\n\nchanges:"

    let namePad = 0
    let additionsPad = 0
    let deletionsPad = 0
    const files: { name: string, additions: string, deletions: string }[] = []
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
        description +=
            `\n  ${file.name.padEnd(namePad)} | ${file.additions.padStart(additionsPad)}+ ${file.deletions.padStart(
                deletionsPad)}-`
    }

    return codeBlock(description)
}

type ArbitraryObject = Record<string, unknown>;

function isErrnoException(error: unknown): error is NodeJS.ErrnoException {
    return isArbitraryObject(error) &&
        error instanceof Error &&
        (typeof error["errno"] === "number" || typeof error["errno"] === "undefined") &&
        (typeof error["code"] === "string" || typeof error["code"] === "undefined") &&
        (typeof error["path"] === "string" || typeof error["path"] === "undefined") &&
        (typeof error["syscall"] === "string" || typeof error["syscall"] === "undefined")
}

function isArbitraryObject(potentialObject: unknown): potentialObject is ArbitraryObject {
    return typeof potentialObject === "object" && potentialObject !== null
}

async function setVersion(): Promise<void> {
    if (!Variables.commitHash) {
        return
    }

    try {
        await mkdir("persisted", {recursive: true})
    } catch (e) {
        if (!isErrnoException(e) || e.code !== "EEXIST") {
            throw e
        }
    }

    await writeFile("persisted/bot/version", Variables.commitHash, {encoding: "utf8"})
}

async function setState(status: State): Promise<void> {
    await writeFile("status", status, {encoding: "utf8"})
}

function setStateSync(status: State): void {
    writeFileSync("status", status, {encoding: "utf8"})
}

async function getState(): Promise<State> {
    try {
        return await readFile("status", "utf8") as State
    } catch (e) {
        if (!isErrnoException(e) || e.code !== "ENOENT") {
            throw e
        }

        return "RECREATE"
    }
}