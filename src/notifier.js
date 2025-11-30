const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

async function sendNotification(email, jobs) {
    if (jobs.length === 0) return;

    const jobListHtml = jobs.map(job => `
    <div style="margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 10px;">
      <h3><a href="${job.link}">${job.title}</a></h3>
      <p><strong>Location:</strong> ${job.location}</p>
    </div>
  `).join('');

    const mailOptions = {
        from: '"IAI Job Alert" <arielvdcr@gmail.com>',
        to: email,
        subject: `New IAI Student Jobs Found! (${jobs.length})`,
        html: `
      <h2>New Jobs Found in Your Area</h2>
      ${jobListHtml}
      <p><small>You are receiving this because you subscribed to job alerts.</small></p>
    `,
    };

    try {
        if (process.env.SMTP_HOST === 'smtp.example.com') {
            console.log('Mock Email Sent to:', email);
            console.log('Subject:', mailOptions.subject);
            console.log('Content Preview:', jobs.map(j => j.title).join(', '));
            return;
        }
        const info = await transporter.sendMail(mailOptions);
        console.log('Message sent: %s', info.messageId);
        console.log('Full response:', info.response);
        console.log('Accepted:', info.accepted);
        console.log('Rejected:', info.rejected);
    } catch (error) {
        console.error('Error sending email:', error);
    }
}

module.exports = { sendNotification };
