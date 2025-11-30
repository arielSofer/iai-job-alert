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
    const { email, location } = req.body;
    if (!email || !location) {
        return res.status(400).json({ error: 'Email and location are required' });
    }

    try {
        await dbRun('INSERT INTO users (email, location) VALUES (?, ?)', [email, location]);
        res.json({ message: 'Subscribed successfully! Sending initial job list...' });

        // Trigger immediate check for this location so the user gets their first email right away
        processLocation(location).catch(err => console.error('Error in initial check:', err));

    } catch (err) {
        if (err.code === 'SQLITE_CONSTRAINT') {
            // Update location if user exists
            try {
                await dbRun('UPDATE users SET location = ? WHERE email = ?', [location, email]);
                res.json({ message: 'Subscription updated successfully! Sending updated job list...' });

                // Trigger check for new location
                processLocation(location).catch(err => console.error('Error in update check:', err));
            } catch (updateErr) {
                console.error(updateErr);
                res.status(500).json({ error: 'Database error during update' });
            }
        } else {
            console.error(err);
            res.status(500).json({ error: 'Database error' });
        }
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
        const users = await dbAll('SELECT id, email FROM users WHERE location = ?', [location]);

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
