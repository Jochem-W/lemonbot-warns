export const Variables = {
    discordToken: process.env["DISCORD_BOT_TOKEN"] as string,
    notionToken: process.env["NOTION_TOKEN"] as string,
    notionPageId: process.env["NOTION_PAGE_ID"] as string,
    storageBucket: process.env["STORAGE_BUCKET"] as string,
    commitHash: process.env["COMMIT_HASH"],
}