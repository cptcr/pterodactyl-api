# Pterodactyl Discord Bot

## Overview

This project integrates the Pterodactyl Panel with a Discord bot, allowing users to manage their game servers directly from Discord. It provides an easy way to interact with the Pterodactyl API, enabling server creation, deletion, and management through simple Discord commands.

## Why This Project is Useful

1. **Ease of Use**: Users can manage their servers without needing to log into the Pterodactyl Panel. All interactions can be done through Discord commands.
2. **Automation**: Automate server management tasks such as starting, stopping, and restarting servers.
3. **Accessibility**: Provides a straightforward interface for non-technical users to manage their servers.
4. **Community Engagement**: Engage your Discord community by allowing them to create and manage their servers easily.

## Features

- **Save API Key**: Users can save their Pterodactyl API key to avoid re-entering it for every command.
- **Server Management**: Create, delete, start, stop, restart, and kill servers using Discord commands.
- **User Management**: Admins can create and delete Pterodactyl users through Discord.
- **Resource Limits**: Ensure users can only create a maximum of two servers with specified resource limits.

## Setup

### Prerequisites

- Node.js and npm
- SQLite3

### Installation

1. Clone the repository:
    ```bash
    git clone https://github.com/cptcr/ptero-api.git
    cd ptero-api
    ```

2. Install dependencies:
    ```bash
    npm i
    ```

3. Create a `.env` file in the root directory with the following content:
    ```
    BOT_TOKEN=your_discord_bot_token
    ADMIN_API_KEY=your_pterodactyl_admin_api_key
    PANEL=https://your_pterodactyl_panel_domain
    PORT=3000
    ```

4. Create an `eggs.json` file in the root directory and add your eggs configuration.

### Running the Bot

## Running the Server
Start the server with:

```bash
node .
```

##Commands
###User Commands
Save API Key
```diff
!saveapikey <api_key>
```
Save your Pterodactyl API key.


Create Server

```php
!createserver <server_name> <egg_name>
```
Create a new server with the specified name and egg. Users can create a maximum of two servers with 1024 MiB RAM, 5120 MiB ROM, 50% CPU, 1 Database, and 1 Backup.

Delete Server
```diff
!deleteserver <server_id>
```
Delete the specified server.

Server Action
```php
!serveraction <server_id> <action>
```
Perform an action (start, stop, restart, kill) on the specified server.

### Admin Commands

Create User
```php
!createuser <email> <first_name> <last_name> <password>
```
Create a new user in the Pterodactyl Panel.

Delete User
```diff
!deleteuser <user_id>
```
Delete a user from the Pterodactyl Panel.

Endpoints
The server provides several endpoints for internal use:

Create User
```bash
POST /admin/create-user
```
Create a new user via the Pterodactyl admin API.

Delete User
```bash
POST /admin/delete-user
```
Delete a user via the Pterodactyl admin API.

Create Server
```bash
POST /create-server
```
Create a new server via the Pterodactyl user API.

Delete Server
```bash
POST /delete-server
```
Delete a server via the Pterodactyl user API.

Server Action
```bash
POST /server-action
```
Perform an action (start, stop, restart, kill) on a server via the Pterodactyl user API.

## Database
This project uses SQLite to store user information locally. The database schema includes:

```sql
users table:
discord_id (primary key)
user_api_key
panel_user_id
created_servers
```