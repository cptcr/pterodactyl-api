const express = require("express");
require("dotenv").config();
//const fetch = require('node-fetch'); //remove the comment lines at the beginning if you use NodeJS v18 or later. Otherwise you need to install node-fetch using npm
const app = express();
const PORT = process.env.PORT;
const panel = process.env.PANEL; // your panel domain (https://panel.domain.com for example)
const apiApp = `${panel}/api/application`;
const apiClient = `${panel}/api/client`;
const token = process.env.ADMIN_API_KEY;
console.log('Imports done.')

let usertk = process.env.USER_API_KEY;

const sendMessage = require("./client").sendMessage;
const fetchUser = require("./client").fetchUser;

/*
sendMessage function:
 variables:
  statusCode: 500, 401, 403, 405, 500
  customMessage: MUST be a string, use "" if no message is provided
  fields: example: { name: "Field name", value: "text here" inline: false}
  discordId: the discord id of the user

fetchUser function:
 variables: 
  userId: the discord id of a user
*/

app.use(express.json());

app.listen(PORT, () => console.log(`API is running at http://localhost:${PORT}/`));
console.log("App setup done.")
/*
Available methods:
0 = DELETE
1 = POST 
2 = GET
*/

async function adminFetcher(endpoint, method, body) {
    const arr = [
        "DELETE",
        "POST",
        "GET"
    ];

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
console.log("Admin fetcher ready!")

async function userFetcher(userToken, endpoint, method, body) {
    const arr = [
        "DELETE",
        "POST",
        "GET"
    ];

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
console.log("User fetcher ready!")

// Endpoint to create a user via the admin API
app.post('/admin/create-user', async (req, res) => {
    const { email, discordId, first_name, last_name, password } = req.body;

    const userData = {
        "email": email,
        "username": discordId, // Assuming discordId is used as the username
        "first_name": first_name,
        "last_name": last_name,
        "password": password
    };

    const resp = await adminFetcher("/users", 1, userData);

    const user = await fetchUser(discordId); // Fetch user details from Discord
    const msg = [
        { name: "Username", value: user.username, inline: false },
        { name: "Name", value: `${first_name} ${last_name}`, inline: false },
        { name: "Password", value: `DO NOT SHARE THIS WITH ANYONE! \n||${password}||`, inline: false }
    ];

    if (resp.object === 'user') {
        sendMessage(200, "", msg, discordId);
        res.status(200).send("User created successfully.");
    } else {
        sendMessage(500, "Error creating user.", [], discordId);
        res.status(500).send("Error creating user.");
    }
});
console.log("Endpoint to create users ready.")

// Endpoint to delete a user via the admin API
app.post('/admin/delete-user', async (req, res) => {
    const { id, discordId } = req.body;

    const resp = await adminFetcher(`/users/${id}`, 0, null);

    const msg = [
        { name: "User ID", value: id.toString(), inline: false }
    ];

    if (resp.status === 204) {
        res.status(200).send("User deleted successfully.");
        sendMessage(200, `The account with the id of **${id}** has been deleted successfully!`, msg, discordId);
    } else if (resp.status === 404) {
        res.status(404).send(`A user with the id ${id} doesn't exist.`);
        sendMessage(404, `The user with id **${id}** couldn't be found.`, msg, discordId);
    } else {
        res.status(resp.status).send("Error deleting user.");
        sendMessage(resp.status, "Error deleting user.", msg, discordId);
    }
});
console.log("Endpoint to delete users ready.")

// Endpoint to create a server via the user API
app.post('/create-server', async (req, res) => {
    const {
        name,
        userid,
        egg,
        docker_image,
        startup,
        environment,
        memory,
        swap,
        disk,
        io,
        cpu,
        databases,
        allocations,
        backups,
        external_id,
        discordId,
        user_api_key
    } = req.body;

    const serverData = {
        name: name,
        user: userid,
        egg: egg,
        docker_image: docker_image,
        startup: startup,
        environment: environment ? environment : {},
        limits: {
            memory: memory,
            swap: swap,
            disk: disk,
            io: io,
            cpu: cpu
        },
        feature_limits: {
            databases: databases ? databases : 0,
            allocations: allocations ? allocations : 0,
            backups: backups ? backups : 0
        },
        external_id: external_id
    };

    const resp = await userFetcher(user_api_key, "/servers", 1, serverData);

    const msg = [
        { name: "Server Name", value: name, inline: false },
        { name: "User ID", value: userid.toString(), inline: false },
        { name: "Egg ID", value: egg.toString(), inline: false }
    ];

    if (resp.object === 'server') {
        res.status(200).send("The server has been created successfully.");
        sendMessage(200, `The server has been created successfully.`, msg, discordId);
    } else {
        res.status(500).send("There was an issue with creating the server.");
        sendMessage(500, `There was an issue with creating the server.`, msg, discordId);
    }
});
console.log("Endpoint to create servers ready.")

// Endpoint to start, stop, restart, or kill a server via the user API
app.post("/server-action", async (req, res) => {
    const { discordid, serverid, user_api_key, action } = req.body;

    const actions = {
        0: "start",
        1: "stop",
        2: "restart",
        3: "kill"
    };

    const signal = actions[action];

    if (!signal) {
        res.status(400).send("Invalid action specified.");
        return;
    }

    const powerAction = { signal: signal };

    const resp = await userFetcher(user_api_key, `/servers/${serverid}/power`, 1, powerAction);

    const msg = [
        { name: "Server ID", value: serverid, inline: false },
        { name: "Action", value: signal, inline: false }
    ];

    if (resp.status === 204) {
        res.status(200).send(`Server ${signal} successfully.`);
        sendMessage(200, `Server ${signal} successfully.`, msg, discordid);
    } else {
        res.status(resp.status).send(`Error performing ${signal} on server.`);
        sendMessage(resp.status, `Error performing ${signal} on server.`, msg, discordid);
    }
});
console.log("Endpoint to perform server actions ready.")

// Endpoint to get server details via the user API
app.get('/server/:serverid', async (req, res) => {
    const { serverid } = req.params;
    const { user_api_key, discordId } = req.query;

    const resp = await userFetcher(user_api_key, `/servers/${serverid}`, 2, null);

    const msg = [
        { name: "Server ID", value: serverid, inline: false },
        { name: "Details", value: JSON.stringify(resp.attributes), inline: false }
    ];

    if (resp.object === 'server') {
        res.status(200).json(resp.attributes);
        sendMessage(200, `Server details fetched successfully.`, msg, discordId);
    } else {
        res.status(500).send("There was an issue fetching the server details.");
        sendMessage(500, `There was an issue fetching the server details.`, msg, discordId);
    }
});
console.log("Endpoint to fetch server details ready.")

// Endpoint to get the list of servers for a user via the user API
app.get('/user-servers/:userid', async (req, res) => {
    const { userid } = req.params;
    const { user_api_key, discordId } = req.query;

    const resp = await userFetcher(user_api_key, `/users/${userid}/servers`, 2, null);

    const msg = [
        { name: "User ID", value: userid.toString(), inline: false },
        { name: "Servers", value: JSON.stringify(resp.data), inline: false }
    ];

    if (resp.data) {
        res.status(200).json(resp.data);
        sendMessage(200, `User servers fetched successfully.`, msg, discordId);
    } else {
        res.status(500).send("There was an issue fetching the user servers.");
        sendMessage(500, `There was an issue fetching the user servers.`, msg, discordId);
    }
});
console.log("Endpoint to fetch user servers ready.")

// Endpoint to create a backup via the user API
app.post('/server/:serverid/backup', async (req, res) => {
    const { serverid } = req.params;
    const { user_api_key, discordId } = req.body;

    const resp = await userFetcher(user_api_key, `/servers/${serverid}/backups`, 1, {});

    const msg = [
        { name: "Server ID", value: serverid, inline: false },
        { name: "Backup Status", value: "Created", inline: false }
    ];

    if (resp.object === 'backup') {
        res.status(200).send("Backup created successfully.");
        sendMessage(200, `Backup created successfully.`, msg, discordId);
    } else {
        res.status(500).send("There was an issue creating the backup.");
        sendMessage(500, `There was an issue creating the backup.`, msg, discordId);
    }
});
console.log("Endpoint to create backups ready.")

// Endpoint to delete a backup via the user API
app.delete('/server/:serverid/backup/:backupid', async (req, res) => {
    const { serverid, backupid } = req.params;
    const { user_api_key, discordId } = req.body;

    const resp = await userFetcher(user_api_key, `/servers/${serverid}/backups/${backupid}`, 0, null);

    const msg = [
        { name: "Server ID", value: serverid, inline: false },
        { name: "Backup ID", value: backupid, inline: false },
        { name: "Backup Status", value: "Deleted", inline: false }
    ];

    if (resp.status === 204) {
        res.status(200).send("Backup deleted successfully.");
        sendMessage(200, `Backup deleted successfully.`, msg, discordId);
    } else {
        res.status(500).send("There was an issue deleting the backup.");
        sendMessage(500, `There was an issue deleting the backup.`, msg, discordId);
    }
});
console.log("Endpoint to delete backups ready.")

// Endpoint to get server metrics via the user API
app.get('/server/:serverid/metrics', async (req, res) => {
    const { serverid } = req.params;
    const { user_api_key, discordId } = req.query;

    const resp = await userFetcher(user_api_key, `/servers/${serverid}/resources`, 2, null);

    const msg = [
        { name: "Server ID", value: serverid, inline: false },
        { name: "Metrics", value: JSON.stringify(resp.attributes), inline: false }
    ];

    if (resp.object === 'resources') {
        res.status(200).json(resp.attributes);
        sendMessage(200, `Server metrics fetched successfully.`, msg, discordId);
    } else {
        res.status(500).send("There was an issue fetching the server metrics.");
        sendMessage(500, `There was an issue fetching the server metrics.`, msg, discordId);
    }
});

console.log("Endpoint to fetch server metrics ready.")
