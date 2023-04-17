import type { Snowflake } from "discord.js"
import { readFile } from "fs/promises"

type RawConfig = {
  banAppealForm: {
    id: string
    questions: {
      banDate: string
      banReason: string
      contactMethod: string
      discordId: string
      discordTag: string
      emailAddress: string
      twitterUsername: string
      unbanReason: string
    }
  }
  bot: {
    applicationId: string
  }
  guild: {
    discussionChannel: string
    errorChannel: string
    id: string
    mailUserId: string
    privateChannels: string[]
    restart: {
      channel: string
      user?: string
    }
    warnCategory: string
    warnLogsChannel: string
  }
  icons: {
    fail: string
    success: string
    warning: string
  }
  repository: {
    name: string
    owner: string
  }
}

class BanAppealFormConfig {
  public readonly id: string
  public readonly questions: BanAppealFormQuestionsConfig

  public constructor(data: RawConfig["banAppealForm"]) {
    this.id = data.id
    this.questions = new BanAppealFormQuestionsConfig(data.questions)
  }
}

class BanAppealFormQuestionsConfig {
  public readonly banDate: string
  public readonly banReason: string
  public readonly contactMethod: string
  public readonly discordId: string
  public readonly discordTag: string
  public readonly emailAddress: string
  public readonly twitterUsername: string
  public readonly unbanReason: string

  public constructor(data: RawConfig["banAppealForm"]["questions"]) {
    this.banDate = data.banDate
    this.banReason = data.banReason
    this.contactMethod = data.contactMethod
    this.discordId = data.discordId
    this.discordTag = data.discordTag
    this.emailAddress = data.emailAddress
    this.twitterUsername = data.twitterUsername
    this.unbanReason = data.unbanReason
  }
}

class BotConfig {
  public readonly applicationId: Snowflake

  public constructor(data: RawConfig["bot"]) {
    this.applicationId = data.applicationId
  }
}

class GuildConfig {
  public readonly discussionChannel: Snowflake
  public readonly errorChannel: Snowflake
  public readonly id: Snowflake
  public readonly mailUserId: Snowflake
  public readonly privateChannels: Snowflake[]
  public readonly restart: GuildRestartConfig
  public readonly warnCategory: Snowflake
  public readonly warnLogsChannel: Snowflake

  public constructor(data: RawConfig["guild"]) {
    this.discussionChannel = data.discussionChannel
    this.errorChannel = data.errorChannel
    this.id = data.id
    this.mailUserId = data.mailUserId
    this.privateChannels = [...data.privateChannels]
    this.restart = new GuildRestartConfig(data.restart)
    this.warnCategory = data.warnCategory
    this.warnLogsChannel = data.warnLogsChannel
  }
}

class GuildRestartConfig {
  public readonly channel: Snowflake
  public readonly user?: Snowflake

  public constructor(data: RawConfig["guild"]["restart"]) {
    this.channel = data.channel
    if (data.user) {
      this.user = data.user
    }
  }
}

class IconsConfig {
  public readonly fail: URL
  public readonly success: URL
  public readonly warning: URL

  public constructor(data: RawConfig["icons"]) {
    this.fail = new URL(data.fail)
    this.success = new URL(data.success)
    this.warning = new URL(data.warning)
  }
}

class RepositoryConfig {
  public readonly name: string
  public readonly owner: string

  public constructor(data: RawConfig["repository"]) {
    this.name = data.name
    this.owner = data.owner
  }
}

class Config {
  public readonly banAppealForm: BanAppealFormConfig
  public readonly bot: BotConfig
  public readonly guild: GuildConfig
  public readonly icons: IconsConfig
  public readonly repository: RepositoryConfig

  private constructor(data: RawConfig) {
    this.banAppealForm = new BanAppealFormConfig(data.banAppealForm)
    this.bot = new BotConfig(data.bot)
    this.guild = new GuildConfig(data.guild)
    this.icons = new IconsConfig(data.icons)
    this.repository = new RepositoryConfig(data.repository)
  }

  public static async load() {
    return new Config(
      JSON.parse(await readFile("config.json", "utf-8")) as RawConfig
    )
  }
}

export const DefaultConfig = await Config.load()
