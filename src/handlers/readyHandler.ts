import {ChannelType, Client, codeBlock, userMention} from "discord.js"
import {mkdir, readFile, writeFile} from "fs/promises"
import {Config} from "../models/config"
import {Handler} from "../interfaces/handler"
import {ResponseBuilder} from "../utilities/responseBuilder"
import {ChannelNotFoundError, InvalidChannelTypeError} from "../errors"
import {writeFileSync} from "fs"
import {Variables} from "../variables"
import {Octokit} from "octokit"

type State = "UP" | "DOWN" | "RECREATE"

export class ReadyHandler implements Handler<"ready"> {
    public readonly event = "ready"

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

        const channel = await client.channels.fetch(Config.restartChannel)
        if (!channel) {
            throw new ChannelNotFoundError(Config.restartChannel)
        }

        if (!channel.isTextBased() || channel.type !== ChannelType.GuildText) {
            throw new InvalidChannelTypeError(channel, ChannelType.GuildText)
        }

        await channel.send({
            content: userMention(Config.restartUser),
            embeds: [ResponseBuilder.makeEmbed(title).setDescription(await getChangelog())],
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
        return null
    }

    // FIXME
    const octokit = new Octokit({auth: Variables.githubToken})
    const response = await octokit.rest.repos.compareCommits({
        base: previousVersion.trim(),
        head: Variables.commitHash,
        owner: "Jochem-W",
        repo: "lemonbot-warns",
    })

    let description = `${previousVersion.slice(0, 7)}..${Variables.commitHash.slice(0, 7)}\n\ncommit log:`
    response.data.commits.reverse()
    for (const commit of response.data.commits) {
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

    await writeFile("persisted/version", Variables.commitHash, {encoding: "utf8"})
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
        return "RECREATE"
    }
}