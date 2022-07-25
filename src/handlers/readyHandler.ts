import {ChannelType, Client, codeBlock, userMention} from "discord.js"
import {readFile, writeFile} from "fs/promises"
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
        previousVersion = await readFile("version", {encoding: "utf8"})
    } catch (e) {
        return null
    }

    // FIXME
    const octokit = new Octokit({auth: Variables.githubToken})
    const response = await octokit.rest.repos.compareCommits({
        base: previousVersion,
        head: Variables.commitHash,
        owner: "Jochem-W",
        repo: "lemonbot-warns",
    })

    let description = `${previousVersion.slice(0, 7)}..${Variables.commitHash.slice(0, 7)}\n\ncommit log:`
    response.data.commits.reverse()
    for (const commit of response.data.commits.reverse()) {
        description += `\n  ${commit.sha.slice(0, 7)} ${commit.commit.message.split("\n")[0]}`
    }

    description += "\n\nchanges:"

    const files: { name: string, changes: string }[] = []
    if (response.data.files) {
        response.data.files.sort((a, b) => a.filename.localeCompare(b.filename))
        for (const file of response.data.files) {
            files.push({name: file.filename, changes: `${file.additions}+ ${file.deletions}-`})
        }
    }

    const longestName = files.reduce((longest, file) => Math.max(longest, file.name.length), 0)
    for (const file of files) {
        description += `\n  ${file.name.padEnd(longestName)} | ${file.changes}`
    }

    return codeBlock(description)
}

async function setVersion(): Promise<void> {
    if (!Variables.commitHash) {
        return
    }

    await writeFile("version", Variables.commitHash, {encoding: "utf8"})
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