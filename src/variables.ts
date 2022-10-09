export const Variables = {
    discordToken: process.env["DISCORD_BOT_TOKEN"] as string,
    notionToken: process.env["NOTION_TOKEN"] as string,
    notionPageId: process.env["NOTION_PAGE_ID"] as string,
    storageBucket: process.env["STORAGE_BUCKET"] as string,
    commitHash: process.env["COMMIT_HASH"],
    githubToken: process.env["GITHUB_TOKEN"] as string,
    s3AccessKeyId: process.env["S3_ACCESS_KEY_ID"] as string,
    s3BucketName: process.env["S3_BUCKET_NAME"] as string,
    s3Endpoint: process.env["S3_ENDPOINT"] as string,
    s3Region: process.env["S3_REGION"] as string,
    s3SecretAccessKey: process.env["S3_SECRET_ACCESS_KEY"] as string,
}