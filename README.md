# Warn with Notion

Advanced warning and note-taking bot that's automagically synchronised with
Notion.

## Setup instructions

The bot uses Docker to ensure a consistent build and runtime environment for all users.

1. Install the latest version of Docker and Docker Compose
2. Clone the repository
3. Edit `.env.example` and `firebase.example.json`

## Running instructions

* To start the bot, run `docker compose up`
    * Additionally, use the `-d` flag to run the bot in the background
    * Additionally, use the `--build` flag to build the bot before starting it
* To view the logs, run `docker compose logs bot`
* To stop the bot, run `docker compose down`
