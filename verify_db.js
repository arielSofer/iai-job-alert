const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'jobs.db');
const db = new sqlite3.Database(dbPath);

const email = 'immediate_test_5@example.com';

db.serialize(() => {
    db.all('SELECT * FROM users', [], (err, users) => {
        if (err) {
            console.error('Error getting users:', err);
            return;
        }
        console.log(`Found ${users.length} users:`);
        users.forEach(u => console.log(`- ${u.email} (${u.location})`));
    });
});
