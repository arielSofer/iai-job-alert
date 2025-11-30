const puppeteer = require('puppeteer');
const crypto = require('crypto');
const db = require('./database');

const BASE_URL = 'https://jobs.iai.co.il/jobs/';
const JOB_TYPE_PARAM = '?tp=%D7%9E%D7%A9%D7%A8%D7%AA%20%D7%A1%D7%98%D7%95%D7%93%D7%A0%D7%98'; // "משרת סטודנט"

async function fetchJobsForLocation(location) {
    let page = 1;
    let allJobs = [];
    let hasMore = true;

    console.log(`Fetching jobs for location: ${location}`);

    const browser = await puppeteer.launch({
        headless: "new",
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const browserPage = await browser.newPage();

    try {
        while (hasMore) {
            const url = `${BASE_URL}${JOB_TYPE_PARAM}&ct=${encodeURIComponent(location)}&page=${page}`;
            console.log(`Fetching URL: ${url}`);

            await browserPage.goto(url, { waitUntil: 'networkidle2' });

            // Extract jobs
            const jobsOnPage = await browserPage.evaluate((loc) => {
                const jobs = [];
                const links = document.querySelectorAll('h3 > a[href^="/job/"]');

                links.forEach(link => {
                    const title = link.innerText.trim();
                    const href = link.getAttribute('href');
                    if (title && href) {
                        jobs.push({
                            title: title,
                            link: href,
                            location: loc // Use passed location
                        });
                    }
                });
                return jobs;
            }, location);

            if (jobsOnPage.length === 0) {
                hasMore = false;
                break;
            }

            jobsOnPage.forEach(job => {
                const id = crypto.createHash('md5').update(job.title + job.link).digest('hex');
                allJobs.push({ ...job, id, link: `https://jobs.iai.co.il${job.link}` });
            });

            // Check for next page
            // We can check if the "Next" button exists and is not disabled
            const hasNext = await browserPage.evaluate(() => {
                const nextBtn = document.querySelector('.pagination .next');
                if (nextBtn && !nextBtn.classList.contains('disabled')) return true;
                // Also check for "Next" text link if class isn't there
                const links = Array.from(document.querySelectorAll('a'));
                return links.some(a => a.innerText.includes('Next') || a.innerText.includes('›'));
            });

            if (!hasNext) {
                hasMore = false;
            } else {
                page++;
            }

            // Safety break
            if (page > 10) hasMore = false;
        }
    } catch (error) {
        console.error(`Error fetching page ${page} for ${location}:`, error.message);
    } finally {
        await browser.close();
    }

    return allJobs;
}

async function saveJobs(jobs) {
    if (jobs.length === 0) return 0;

    const dbRun = (sql, params = []) => {
        return new Promise((resolve, reject) => {
            db.run(sql, params, function (err) {
                if (err) reject(err);
                else resolve(this);
            });
        });
    };

    const runStmt = (stmt, params) => {
        return new Promise((resolve, reject) => {
            stmt.run(...params, function (err) {
                if (err) reject(err);
                else resolve(this);
            });
        });
    };

    let newJobsCount = 0;
    const stmt = db.prepare('INSERT OR IGNORE INTO jobs (id, title, location, link) VALUES (?, ?, ?, ?)');

    try {
        await dbRun("BEGIN TRANSACTION");
        for (const job of jobs) {
            const result = await runStmt(stmt, [job.id, job.title, job.location, job.link]);
            if (result.changes > 0) {
                newJobsCount++;
            }
        }
        stmt.finalize();
        await dbRun("COMMIT");
        return newJobsCount;
    } catch (err) {
        console.error("Error saving jobs:", err);
        try {
            await dbRun("ROLLBACK");
        } catch (rollbackErr) {
            console.error("Rollback error:", rollbackErr);
        }
        throw err;
    }
}

module.exports = { fetchJobsForLocation, saveJobs };
