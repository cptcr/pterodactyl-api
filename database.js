const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database(':memory:'); // Change to a file if you want persistence

// Initialize the database schema
db.serialize(() => {
    db.run(`
        CREATE TABLE users (
            discord_id TEXT PRIMARY KEY,
            user_api_key TEXT,
            panel_user_id TEXT,
            created_servers INTEGER DEFAULT 0
        )
    `);
});

module.exports = db;
