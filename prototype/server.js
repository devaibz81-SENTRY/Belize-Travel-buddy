const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');
const https = require('https');
const qs = require('querystring');

const app = express();
const PORT = 3000;

app.use(cors());

// Ignore self-signed cert issues
const agent = new https.Agent({
    rejectUnauthorized: false
});

// Cache storage
let cachedOperators = null;
let lastCacheTime = 0;
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

// The target URL
const BTB_URL = 'https://datalink.belizetourismboard.org:8443/BtbWebReports/TourOperatorListing.aspx';

/**
 * Route: /api/operators
 * Fetch all pages from BTB and return combined list
 */
app.get('/api/operators', async (req, res) => {
    try {
        // Return cache if valid
        if (cachedOperators && (Date.now() - lastCacheTime < CACHE_DURATION)) {
            console.log(`Returning ${cachedOperators.length} operators from cache.`);
            return res.json({
                success: true,
                count: cachedOperators.length,
                data: cachedOperators,
                cached: true
            });
        }

        console.log('Starting full scrape of all pages...');

        // Start scraping process
        const allOperators = await scrapeAllPages();

        // Update cache
        cachedOperators = allOperators;
        lastCacheTime = Date.now();

        console.log(`Scrape complete. Found ${allOperators.length} total operators.`);

        res.json({
            success: true,
            count: allOperators.length,
            data: allOperators,
            cached: false
        });

    } catch (error) {
        console.error('Scraping Fatal Error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch live data',
            error: error.message
        });
    }
});

/**
 * Main scraping recursive function
 */
async function scrapeAllPages() {
    let operators = [];
    let hasNextPage = true;
    let cookies = null;
    let viewState = null;
    let eventValidation = null;
    let viewStateGenerator = null;
    let pageCount = 1;

    // Initial Request (Page 1)
    console.log(`Fetching Page ${pageCount}...`);
    let response = await axios.get(BTB_URL, { httpsAgent: agent });

    // Save cookies (important for ASP.NET sessions)
    if (response.headers['set-cookie']) {
        cookies = response.headers['set-cookie'].map(c => c.split(';')[0]).join('; ');
    }

    while (hasNextPage) {
        const html = response.data;
        const $ = cheerio.load(html);

        // 1. Extract Data from current page
        const pageOperators = extractOperatorsFromTable($);
        operators = operators.concat(pageOperators);
        console.log(`   Found ${pageOperators.length} operators on Page ${pageCount}`);

        // 2. Prepare for Next Page checking
        // Extract ASP.NET hidden fields required for pagination
        viewState = $('#__VIEWSTATE').val();
        eventValidation = $('#__EVENTVALIDATION').val();
        viewStateGenerator = $('#__VIEWSTATEGENERATOR').val();

        // 3. Find "Next" button/link logic
        // Look for the standard ASP.NET GridView pagination
        // Usually it's a table row at the bottom with numbers 1 2 3 ...
        // We look for a link that represents the "Next" page or the page number (current + 1)

        const nextPageNum = pageCount + 1;
        // Search for a link with verify "Page$N" or strict "Next" arrow
        // Note: The specific ID pattern often involves 'GridView1'
        let nextLink = $(`a[href*="Page$${nextPageNum}"]`).first();

        if (nextLink.length > 0) {
            const href = nextLink.attr('href');
            // Extract the EventTarget from "javascript:__doPostBack('ctl00$Main...','Page$2')"
            const match = href.match(/__doPostBack\('([^']+)','([^']+)'\)/);

            if (match) {
                const eventTarget = match[1];
                const eventArgument = match[2];

                console.log(`--> Moving to Page ${nextPageNum}...`);

                // POST request for the next page
                const formData = {
                    __EVENTTARGET: eventTarget,
                    __EVENTARGUMENT: eventArgument,
                    __VIEWSTATE: viewState,
                    __VIEWSTATEGENERATOR: viewStateGenerator,
                    __EVENTVALIDATION: eventValidation
                };

                // Add any other form inputs that might be present (often required)
                // We grab all inputs and strip the special ones we just added to avoid dupes/errors
                $('input').each((i, el) => {
                    const name = $(el).attr('name');
                    const val = $(el).val();
                    if (name && !formData[name] && name !== '__VIEWSTATE' && name !== '__EVENTVALIDATION') {
                        formData[name] = val;
                    }
                });

                response = await axios.post(BTB_URL, qs.stringify(formData), {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Cookie': cookies,
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                    },
                    httpsAgent: agent
                });

                pageCount++;
                // Update cookies if they changed (rare but possible)
                if (response.headers['set-cookie']) {
                    cookies = response.headers['set-cookie'].map(c => c.split(';')[0]).join('; ');
                }
            } else {
                hasNextPage = false;
            }
        } else {
            console.log('No next page found. Finishing scrape.');
            hasNextPage = false;
        }

        // Safety break to prevent infinite loops during dev
        if (pageCount > 15) {
            console.log('Reached safety limit of 15 pages. Stopping.');
            hasNextPage = false;
        }
    }

    return operators;
}

/**
 * Standardized Operator Extractor
 */
function extractOperatorsFromTable($) {
    const operators = [];

    // Target the main table. Usually generic 'table' scrape works best if structure is simple
    // or we look for specific headers.
    $('tr').each((i, el) => {
        const tds = $(el).find('td');
        if (tds.length < 4) return; // Skip non-data rows

        const name = $(tds[0]).text().trim();
        // Heuristic: If name is empty or looks like a header "Name", skip
        if (!name || name === 'Name' || name.includes('Company Name')) return;

        // Based on column mapping observed/assumed
        // Col 0: Name
        // Col 1: Phone
        // Col 2: Address
        // Col 3: Email
        // Col 4: Website

        const phone = $(tds[1]).text().trim();
        const address = $(tds[2]).text().trim();
        const email = $(tds[3]).text().trim();
        const website = $(tds[4]).text().trim();

        operators.push({
            id: generateId(name),
            name: name,
            phone: phone,
            address: {
                full: address,
                district: extractDistrict(address)
            },
            email: email,
            website: website,

            // Smart Fields
            district: extractDistrict(address),
            location: extractLocation(address),
            category: categorizeOperator(name),
            priceRange: estimatePriceRange(name),
            rating: generateRating()
        });
    });

    return operators;
}

// --- Helpers ---

function generateId(name) {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10) + Math.floor(Math.random() * 1000);
}

function extractDistrict(address) {
    if (!address) return 'Belize';
    const addr = address.toLowerCase();

    // Primary Districts
    if (addr.includes('cayo') || addr.includes('san ignacio') || addr.includes('santa elena') || addr.includes('benque') || addr.includes('bullet tree')) return 'Cayo';
    if (addr.includes('stann') || addr.includes('placencia') || addr.includes('dangriga') || addr.includes('hopkins')) return 'Stann Creek';
    if (addr.includes('corozal')) return 'Corozal';
    if (addr.includes('orange walk')) return 'Orange Walk';
    if (addr.includes('toledo') || addr.includes('punta gorda')) return 'Toledo';
    if (addr.includes('san pedro') || addr.includes('ambergris') || addr.includes('caye caulker') || addr.includes('belize city') || addr.includes('ladyville')) return 'Belize'; // Belize District

    return 'Belize';
}

function extractLocation(address) {
    if (!address) return 'Belize';
    const locations = ['San Pedro', 'Caye Caulker', 'San Ignacio', 'Santa Elena', 'Benque', 'Placencia', 'Hopkins', 'Dangriga', 'Belize City', 'Ladyville', 'Corozal', 'Orange Walk', 'Punta Gorda'];
    for (const loc of locations) {
        if (address.toLowerCase().includes(loc.toLowerCase())) return loc;
    }
    return 'Belize';
}

function categorizeOperator(name) {
    if (!name) return 'General';
    const n = name.toLowerCase();
    if (n.includes('dive') || n.includes('scuba') || n.includes('sea') || n.includes('snork')) return 'Diving';
    if (n.includes('maya') || n.includes('ruin') || n.includes('archaeolog')) return 'Mayan Tours';
    if (n.includes('adventure') || n.includes('cave') || n.includes('zip') || n.includes('jungle')) return 'Adventure';
    if (n.includes('fish')) return 'Fishing';
    if (n.includes('resort') || n.includes('hotel') || n.includes('lodge')) return 'Resort';
    if (n.includes('rent') || n.includes('golf cart')) return 'Rentals';
    return 'General';
}

function estimatePriceRange(name) {
    const n = name.toLowerCase();
    if (n.includes('luxury') || n.includes('resort') || n.includes('heli') || n.includes('private')) return '$$$';
    if (n.includes('dive') || n.includes('adventure')) return '$$';
    return '$';
}

function generateRating() {
    return (4.2 + Math.random() * 0.8).toFixed(1);
}

app.listen(PORT, () => {
    console.log(`Travel Buddy Live Scraper running on http://localhost:${PORT}`);
    console.log(`Ready to fetch operators.`);
});
