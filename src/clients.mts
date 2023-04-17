import { Variables } from "./variables.mjs"
import { S3Client } from "@aws-sdk/client-s3"
import { auth, forms } from "@googleapis/forms"
import { sheets } from "@googleapis/sheets"
import { Octokit } from "@octokit/rest"
import { PrismaClient } from "@prisma/client"
import { Client, GatewayIntentBits, Partials } from "discord.js"

const GoogleAuth = new auth.GoogleAuth({
  scopes: [
    "https://www.googleapis.com/auth/forms.responses.readonly",
    "https://www.googleapis.com/auth/forms.body.readonly",
    "https://www.googleapis.com/auth/spreadsheets.readonly",
  ],
})

export const Prisma = new PrismaClient()
export const S3 = new S3Client({
  region: Variables.s3Region,
  endpoint: Variables.s3Endpoint,
  credentials: {
    accessKeyId: Variables.s3AccessKeyId,
    secretAccessKey: Variables.s3SecretAccessKey,
  },
})
export const Forms = forms({ version: "v1", auth: GoogleAuth })
export const Sheets = sheets({ version: "v4", auth: GoogleAuth })
export const Discord = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildBans,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [
    Partials.User,
    Partials.Channel,
    Partials.GuildMember,
    Partials.Message,
    Partials.Reaction,
    Partials.GuildScheduledEvent,
    Partials.ThreadMember,
  ],
})
Discord.rest.setToken(Variables.discordToken)
export const GitHubClient = new Octokit({ auth: Variables.githubToken })
