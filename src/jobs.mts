import { CheckBanAppealFormJob } from "./jobs/checkBanAppealFormJob.mjs"
import { CronJob } from "cron"

export const Jobs: CronJob[] = [CheckBanAppealFormJob]
