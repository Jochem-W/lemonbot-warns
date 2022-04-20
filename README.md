# Warn with Notion

Advanced warning and note-taking bot that's automagically synchronised with
Notion.

## Setup instructions

1. Install Docker by following [these instructions](https://docs.docker.com/get-docker/)
2. On Linux, install the latest version of Docker Compose by following
   [these instructions](https://docs.docker.com/compose/cli-command/#installing-compose-v2)
3. Clone the repository
4. Edit `docker-compose.yml` and `config.ts`

## Running instructions

The bot uses Docker to ensure a consistent build and runtime environment for all users.

* To start the bot, run `docker compose up`
    * Additionally, use the `-d` flag to run the bot in the background
    * Additionally, use the `--build` flag to build the bot before starting it
* To view the logs, run `docker compose logs bot`
* To stop the bot, run `docker compose down`
