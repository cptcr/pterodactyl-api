const { Client, Partials, GatewayIntentBits, EmbedBuilder } = require("discord.js");
require('dotenv').config();
const db = require('./database');
const fs = require('fs');
const eggs = JSON.parse(fs.readFileSync('./eggs.json', 'utf8'));

const client = new Client({
    partials: [
        Partials.Message,
        Partials.GuildMember,
        Partials.User
    ],
    intents: [
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.DirectMessageTyping,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

client.login(process.env.BOT_TOKEN).then(() => {console.log("Client is ready!")})

const adminWhitelist = ['ADMIN_DISCORD_ID_1', 'ADMIN_DISCORD_ID_2']; // Replace with actual Discord user IDs
const panel = process.env.PANEL;
const apiApp = `${panel}/api/application`;
const apiClient = `${panel}/api/client`;
const token = process.env.ADMIN_API_KEY;

async function sendMessage(statusCode, customMessage, fields, discordId) {
    let color;
    let title;
    let msg;

    if (customMessage) {
        customMessage.length === 0 ? msg = "" : msg = customMessage;
    } 

    switch (statusCode) {
        case 200:
            color = "Green";
            title = "Success | OK";
            break;
        case 401:
            color = "Red";
            title = "Error | Unauthorized";
            msg = "Your API Token was invalid.";
            break;
        case 403:
            color = "Red";
            title = "Forbidden | Access denied";
            msg = "Your API key does not have the required permissions to perform this action";
            break;
        case 404:
            color = "Red";
            title = "Error | Endpoint not found";
            break;
        case 500:
            color = "Red";
            title = "Error | Internal Server Error";
            msg = "There was an internal server error. Not your fault, don't worry! Send us the requested endpoint and how to recreate this at https://discord.com/invite/cptcr";
            break;
        default:
            color = "Red";
            title = "Error";
            break;
    }

    const embed = new EmbedBuilder({ fields: fields }).setTitle(title).setColor(color);

    if (msg) {
        embed.setDescription(msg);
    }

    const user = await fetchUser(discordId);

    return await user.send({ embeds: [embed] });
}

async function fetchUser(id) {
    const user = await client.users.cache.get(id).catch(err => {
        console.log(err);
    });

    return user;
}

async function adminFetcher(endpoint, method, body) {
    const arr = ["DELETE", "POST", "GET"];
    let m = arr[method];

    const response = await fetch(`${apiApp}${endpoint}`, {
        method: m,
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
        },
        body: method === 0 ? null : JSON.stringify(body)
    });

    const data = await response.json();
    return data;
}

async function userFetcher(userToken, endpoint, method, body) {
    const arr = ["DELETE", "POST", "GET"];
    let m = arr[method];

    const response = await fetch(`${apiClient}${endpoint}`, {
        method: m,
        headers: {
            "Authorization": `Bearer ${userToken}`,
            "Content-Type": "application/json",
        },
        body: method === 0 ? null : JSON.stringify(body)
    });

    const data = await response.json();
    return data;
}

client.on("messageCreate", async message => {
    if (message.author.bot) return;

    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    const discordId = message.author.id;

    if (command === 'saveapikey') {
        const [apiKey] = args;

        db.run(`INSERT INTO users (discord_id, user_api_key) VALUES (?, ?) ON CONFLICT(discord_id) DO UPDATE SET user_api_key = ?`, [discordId, apiKey, apiKey], (err) => {
            if (err) {
                sendMessage(500, "Error saving API key.", [], discordId);
            } else {
                sendMessage(200, "API key saved successfully.", [], discordId);
            }
        });
    }

    if (command === 'createuser') {
        if (!adminWhitelist.includes(discordId)) {
            return sendMessage(403, "Access denied", [], discordId);
        }
        const [email, first_name, last_name, password] = args;

        const userData = {
            "email": email,
            "username": discordId,
            "first_name": first_name,
            "last_name": last_name,
            "password": password
        };

        const resp = await adminFetcher("/users", 1, userData);

        const user = await fetchUser(discordId);
        const msg = [
            { name: "Username", value: user.username, inline: false },
            { name: "Name", value: `${first_name} ${last_name}`, inline: false },
            { name: "Password", value: `DO NOT SHARE THIS WITH ANYONE! \n||${password}||`, inline: false }
        ];

        if (resp.object === 'user') {
            db.run(`UPDATE users SET panel_user_id = ? WHERE discord_id = ?`, [resp.attributes.id, discordId], (err) => {
                if (err) {
                    sendMessage(500, "Error updating user information.", [], discordId);
                } else {
                    sendMessage(200, "", msg, discordId);
                }
            });
        } else {
            sendMessage(500, "Error creating user.", [], discordId);
        }
    }

    if (command === 'deleteuser') {
        if (!adminWhitelist.includes(discordId)) {
            return sendMessage(403, "Access denied", [], discordId);
        }
        const [id] = args;

        const resp = await adminFetcher(`/users/${id}`, 0, null);

        const msg = [
            { name: "User ID", value: id.toString(), inline: false }
        ];

        if (resp.status === 204) {
            db.run(`DELETE FROM users WHERE panel_user_id = ?`, [id], (err) => {
                if (err) {
                    sendMessage(500, "Error deleting user information from database.", [], discordId);
                } else {
                    sendMessage(200, `The account with the id of **${id}** has been deleted successfully!`, msg, discordId);
                }
            });
        } else if (resp.status === 404) {
            sendMessage(404, `The user with id **${id}** couldn't be found.`, msg, discordId);
        } else {
            sendMessage(resp.status, "Error deleting user.", msg, discordId);
        }
    }

    if (command === 'createserver') {
        const [name, eggName] = args;

        db.get(`SELECT user_api_key, created_servers FROM users WHERE discord_id = ?`, [discordId], async (err, row) => {
            if (err || !row) {
                return sendMessage(500, "Error retrieving user information.", [], discordId);
            }

            if (row.created_servers >= 2) {
                return sendMessage(403, "You have reached the maximum number of servers (2).", [], discordId);
            }

            const egg = eggs.find(e => e.name === eggName);
            if (!egg) {
                return sendMessage(404, "Egg not found.", [], discordId);
            }

            const serverData = {
                name: name,
                user: discordId,
                egg: egg.egg.meta.version,
                docker_image: Object.values(egg.egg.docker_images)[0],
                startup: egg.egg.startup,
                environment: {},
                limits: {
                    memory: 1024,
                    swap: 0,
                    disk: 5120,
                    io: 500,
                    cpu: 50
                },
                feature_limits: {
                    databases: 1,
                    allocations: 1,
                    backups: 1
                },
                external_id: ""
            };

            const resp = await userFetcher(row.user_api_key, "/servers", 1, serverData);

            const msg = [
                { name: "Server Name", value: name, inline: false },
                { name: "Egg", value: eggName, inline: false }
            ];

            if (resp.object === 'server') {
                db.run(`UPDATE users SET created_servers = created_servers + 1 WHERE discord_id = ?`, [discordId], (err) => {
                    if (err) {
                        sendMessage(500, "Error updating server count.", [], discordId);
                    } else {
                        sendMessage(200, `The server has been created successfully.`, msg, discordId);
                    }
                });
            } else {
                sendMessage(500, `There was an issue with creating the server.`, msg, discordId);
            }
        });
    }

    if (command === 'deleteserver') {
        const [serverid] = args;

        db.get(`SELECT user_api_key FROM users WHERE discord_id = ?`, [discordId], async (err, row) => {
            if (err || !row) {
                return sendMessage(500, "Error retrieving user information.", [], discordId);
            }

            const resp = await userFetcher(row.user_api_key, `/servers/${serverid}`, 0, null);

            const msg = [
                { name: "Server ID", value: serverid, inline: false }
            ];

            if (resp.status === 204) {
                db.run(`UPDATE users SET created_servers = created_servers - 1 WHERE discord_id = ?`, [discordId], (err) => {
                    if (err) {
                        sendMessage(500, "Error updating server count.", [], discordId);
                    } else {
                        sendMessage(200, `Server deleted successfully.`, msg, discordId);
                    }
                });
            } else {
                sendMessage(resp.status, `Error deleting server.`, msg, discordId);
            }
        });
    }

    if (command === 'serveraction') {
        const [serverid, action] = args;

        db.get(`SELECT user_api_key FROM users WHERE discord_id = ?`, [discordId], async (err, row) => {
            if (err || !row) {
                return sendMessage(500, "Error retrieving user information.", [], discordId);
            }

            const actions = {
                "start": "start",
                "stop": "stop",
                "restart": "restart",
                "kill": "kill"
            };

            const signal = actions[action];

            if (!signal) {
                return sendMessage(400, "Invalid action specified.", [], discordId);
            }

            const powerAction = { signal: signal };

            const resp = await userFetcher(row.user_api_key, `/servers/${serverid}/power`, 1, powerAction);

            const msg = [
                { name: "Server ID", value: serverid, inline: false },
                { name: "Action", value: signal, inline: false }
            ];

            if (resp.status === 204) {
                sendMessage(200, `Server ${signal} successfully.`, msg, discordId);
            } else {
                sendMessage(resp.status, `Error performing ${signal} on server.`, msg, discordId);
            }
        });
    }
});

client.login(process.env.BOT_TOKEN).then(() => {
    console.log("Discord Bot started and is ready to use!")
});

module.exports = {
    client,
    sendMessage,
    fetchUser
}
