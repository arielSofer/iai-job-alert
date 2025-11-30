# IAI Student Job Alert Platform Implementation Plan

## Goal Description
Create a platform that allows users to subscribe to email alerts for new student jobs at IAI (Israel Aerospace Industries) based on their preferred residential area. The system will periodically scrape the IAI jobs website, detect new listings, and notify relevant subscribers.

## User Review Required
> [!IMPORTANT]
> **Email Configuration**: The system requires an SMTP server to send emails. For development/testing, I will use a mock logger or a placeholder. For production, you will need to provide SMTP credentials (e.g., Gmail, SendGrid) in a `.env` file.

> [!NOTE]
> **Hosting**: This plan assumes a local Node.js environment. For a real "platform", this would need to be deployed to a server (e.g., Heroku, VPS) to run the scheduled scraper.

## Proposed Changes

### Backend (Node.js)

#### [NEW] [package.json](file:///Users/ariels/.gemini/antigravity/brain/5eb768e9-7559-405a-a4f8-fda1d5f235da/package.json)
- Dependencies: `express`, `better-sqlite3`, `axios`, `cheerio`, `nodemailer`, `node-cron`, `dotenv`.

#### [NEW] [database.js](file:///Users/ariels/.gemini/antigravity/brain/5eb768e9-7559-405a-a4f8-fda1d5f235da/src/database.js)
- SQLite connection using `better-sqlite3`.
- Tables:
    - `users`: `id`, `email`, `location`, `created_at`
    - `jobs`: `id` (hash), `title`, `location`, `link`, `seen_at`
    - `notifications`: `id`, `user_id`, `job_id`, `sent_at`

#### [NEW] [scraper.js](file:///Users/ariels/.gemini/antigravity/brain/5eb768e9-7559-405a-a4f8-fda1d5f235da/src/scraper.js)
- `fetchJobsForLocation(location)`: Scrapes pages for a specific location.
- `checkForNewJobs()`: Main function to run periodically.
- Uses `axios` to fetch HTML and `cheerio` to parse.

#### [NEW] [server.js](file:///Users/ariels/.gemini/antigravity/brain/5eb768e9-7559-405a-a4f8-fda1d5f235da/src/server.js)
- Express server.
- `GET /api/locations`: Returns list of supported locations.
- `POST /api/subscribe`: Registers a user.
- Serves static files from `public/`.

#### [NEW] [notifier.js](file:///Users/ariels/.gemini/antigravity/brain/5eb768e9-7559-405a-a4f8-fda1d5f235da/src/notifier.js)
- Handles sending emails using `nodemailer`.

### Frontend (HTML/CSS/JS)

#### [NEW] [index.html](file:///Users/ariels/.gemini/antigravity/brain/5eb768e9-7559-405a-a4f8-fda1d5f235da/public/index.html)
- Simple, clean UI.
- Form with Email input and Location dropdown.
- Success/Error messages.

#### [NEW] [style.css](file:///Users/ariels/.gemini/antigravity/brain/5eb768e9-7559-405a-a4f8-fda1d5f235da/public/style.css)
- Modern, responsive design (CSS Grid/Flexbox).
- IAI-inspired color palette (Blue/White/Grey).

#### [NEW] [app.js](file:///Users/ariels/.gemini/antigravity/brain/5eb768e9-7559-405a-a4f8-fda1d5f235da/public/app.js)
- Fetches locations from API.
- Handles form submission.

## Verification Plan

### Automated Tests
- **Scraper Test**: Run a script that calls `fetchJobsForLocation('יהוד')` and verifies it returns an array of jobs with title and link.
- **Database Test**: Verify user insertion and job deduplication logic.

### Manual Verification
1.  Start server (`npm start`).
2.  Open `http://localhost:3000`.
3.  Subscribe with a test email and location.
4.  Trigger the scraper manually.
5.  Check console/logs to see if a "new job" was detected and an "email" was sent (logged).
