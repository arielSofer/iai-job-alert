const express = require('express');
const path = require('path');
const db = require('./database');
const { fetchJobsForLocation, saveJobs } = require('./scraper');
const { sendNotification } = require('./notifier');
const cron = require('node-cron');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Helper functions for sqlite3 async
function dbRun(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
}

function dbAll(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

// API: Get supported locations
app.get('/api/locations', (req, res) => {
    // Hardcoded for now based on research, could be dynamic later
    const locations = [
        "יהוד", "נתב\"ג", "ירושלים", "אשדוד", "באר יעקב", "חיפה", "באר שבע", "רמת הגולן", "פתח תקווה"
    ];
    res.json(locations);
});

// API: Subscribe
app.post('/api/subscribe', async (req, res) => {
    const { email, locations } = req.body;
    if (!email || !locations || !Array.isArray(locations) || locations.length === 0) {
        return res.status(400).json({ error: 'Email and at least one location are required' });
    }

    try {
        // 1. Ensure user exists
        // We use INSERT OR IGNORE. If it exists, we just get the ID.
        await dbRun('INSERT OR IGNORE INTO users (email) VALUES (?)', [email]);

        // Get user ID
        const user = await new Promise((resolve, reject) => {
            db.get('SELECT id FROM users WHERE email = ?', [email], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (!user) throw new Error('User creation failed');

        // 2. Update locations (Overwrite strategy)
        await dbRun('BEGIN TRANSACTION');
        try {
            // Remove old locations
            await dbRun('DELETE FROM user_locations WHERE user_id = ?', [user.id]);

            // Add new locations
            const stmt = db.prepare('INSERT INTO user_locations (user_id, location) VALUES (?, ?)');
            const runStmt = (userId, loc) => new Promise((resolve, reject) => {
                stmt.run(userId, loc, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });

            for (const loc of locations) {
                await runStmt(user.id, loc);
            }
            stmt.finalize();
            await dbRun('COMMIT');
        } catch (txErr) {
            await dbRun('ROLLBACK');
            throw txErr;
        }

        res.json({ message: 'Subscribed successfully! Sending initial job lists...' });

        // Trigger checks for all selected locations
        for (const loc of locations) {
            processLocation(loc).catch(err => console.error(`Error in initial check for ${loc}:`, err));
        }

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Scheduled Task: Check for jobs every hour
cron.schedule('0 * * * *', async () => {
    console.log('Running scheduled job check...');
    checkAndNotify();
});

async function checkAndNotify() {
    // 1. Get all unique locations from users
    try {
        const rows = await dbAll('SELECT DISTINCT location FROM users');
        const locations = rows.map(row => row.location);

        for (const location of locations) {
            await processLocation(location);
        }
        console.log('Job check complete.');
    } catch (err) {
        console.error('Error in checkAndNotify:', err);
    }
}

async function processLocation(location) {
    console.log(`Processing location: ${location}`);
    // 2. Fetch jobs for location
    const jobs = await fetchJobsForLocation(location);

    // 3. Save jobs
    await saveJobs(jobs);

    // 4. Notify users
    try {
        // Find users subscribed to this location
        const users = await dbAll(
            'SELECT u.id, u.email FROM users u JOIN user_locations ul ON u.id = ul.user_id WHERE ul.location = ?',
            [location]
        );

        if (users.length === 0) {
            console.log(`No users subscribed to ${location}`);
            return;
        }

        for (const user of users) {
            // Find jobs for this location that this user hasn't been notified about
            const newJobs = await dbAll(`
                SELECT j.* FROM jobs j
                WHERE j.location = ? 
                AND j.id NOT IN (SELECT job_id FROM notifications WHERE user_id = ?)
            `, [location, user.id]);

            if (newJobs.length > 0) {
                console.log(`Sending ${newJobs.length} jobs to ${user.email}`);
                await sendNotification(user.email, newJobs);

                // Record notifications
                // Use transaction for batch insert
                try {
                    await dbRun("BEGIN TRANSACTION");
                    const stmt = db.prepare('INSERT INTO notifications (user_id, job_id) VALUES (?, ?)');

                    // Promisify stmt.run
                    const runStmt = (userId, jobId) => new Promise((resolve, reject) => {
                        stmt.run(userId, jobId, (err) => {
                            if (err) reject(err);
                            else resolve();
                        });
                    });

                    for (const job of newJobs) {
                        await runStmt(user.id, job.id);
                    }
                    stmt.finalize();
                    await dbRun("COMMIT");
                } catch (txErr) {
                    console.error('Transaction error:', txErr);
                    await dbRun("ROLLBACK");
                }
            }
        }
    } catch (err) {
        console.error(`Error processing location ${location}:`, err);
    }
}

// Manual trigger for testing
app.post('/api/trigger-check', async (req, res) => {
    try {
        await checkAndNotify();
        res.json({ message: 'Check triggered' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error triggering check' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
