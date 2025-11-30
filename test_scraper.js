const { fetchJobsForLocation } = require('./src/scraper');

async function test() {
    try {
        console.log('Testing scraper for יהוד...');
        const jobs = await fetchJobsForLocation('יהוד');
        console.log(`Found ${jobs.length} jobs:`);
        jobs.forEach(j => console.log(`- ${j.title} (${j.link})`));
    } catch (err) {
        console.error('Error:', err);
    }
}

test();
