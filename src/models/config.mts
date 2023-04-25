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
  icons: {
    fail: string
    success: string
    warning: string
  }
  mailUserId: string
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
  public readonly icons: IconsConfig
  public readonly mailUserId: Snowflake
  public readonly repository: RepositoryConfig

  private constructor(data: RawConfig) {
    this.banAppealForm = new BanAppealFormConfig(data.banAppealForm)
    this.bot = new BotConfig(data.bot)
    this.icons = new IconsConfig(data.icons)
    this.mailUserId = data.mailUserId
    this.repository = new RepositoryConfig(data.repository)
  }

  public static async load() {
    return new Config(
      JSON.parse(await readFile("config.json", "utf-8")) as RawConfig
    )
  }
}

export const DefaultConfig = await Config.load()
