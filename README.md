# Lemonbot Warns

Custom Discord bot to manage warnings for the Lemon Tree Discord server.

## Setup

The bot uses Docker to ensure a consistent build and runtime environment.

1. Install the latest version of Docker and Docker Compose
2. Clone the repository
3. Edit `.env.example`, `firebase.example.json` and `config.example.json`

## Running the bot

* To start the bot, run `docker compose up`
  * Additionally, use the `-d` flag to run the bot in the background
  * Additionally, use the `--build` flag to build the bot before starting it
* To view the logs, run `docker compose logs bot`
* To stop the bot, run `docker compose down`

## License

Source code contained in this repository is licensed under the GNU Affero General Public License version 3. If you run a
modified version of this software on a server, the modified source code must be accessible to users of the software. For
more information, see the LICENSE file.
