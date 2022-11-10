export const Variables = {
    discordToken: process.env["DISCORD_BOT_TOKEN"] as string,
    commitHash: process.env["COMMIT_HASH"],
    githubToken: process.env["GITHUB_TOKEN"] as string,
    s3AccessKeyId: process.env["S3_ACCESS_KEY_ID"] as string,
    s3Endpoint: process.env["S3_ENDPOINT"] as string,
    s3Region: process.env["S3_REGION"] as string,
    s3SecretAccessKey: process.env["S3_SECRET_ACCESS_KEY"] as string,
    s3ArchiveBucketName: process.env["S3_ARCHIVE_BUCKET_NAME"] as string,
    s3WarningsBucketName: process.env["S3_WARNINGS_BUCKET_NAME"] as string,
    s3WarningsBucketUrl: process.env["S3_WARNINGS_BUCKET_URL"] as string,
    nodeEnvironment: process.env["NODE_ENV"] as string,
}