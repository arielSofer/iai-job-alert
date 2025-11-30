const axios = require('axios');
const cheerio = require('cheerio');

const url = 'https://jobs.iai.co.il/jobs/?tp=%D7%9E%D7%A9%D7%A8%D7%AA%20%D7%A1%D7%98%D7%95%D7%93%D7%A0%D7%98&ct=%D7%99%D7%94%D7%95%D7%93&page=1';

async function debug() {
    try {
        console.log(`Fetching ${url}...`);
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9,he;q=0.8',
                'Upgrade-Insecure-Requests': '1'
            }
        });
        const html = response.data;
        console.log('HTML length:', html.length);

        const $ = cheerio.load(html);
        const links = $('a');
        console.log('Total links:', links.length);

        const jobLinks = $('a[href^="/job/"]');
        console.log('Job links found:', jobLinks.length);

        if (jobLinks.length > 0) {
            console.log('First job link:', jobLinks.first().attr('href'));
            console.log('Parent tag:', jobLinks.first().parent().prop('tagName'));
        } else {
            console.log('No job links found. Dumping first 500 chars of body:');
            console.log($('body').html().substring(0, 500));
        }

    } catch (err) {
        console.error(err);
    }
}

debug();
