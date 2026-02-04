import { NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';
import https from 'https';
import qs from 'querystring';

// Target URL
const BTB_URL = 'https://datalink.belizetourismboard.org:8443/BtbWebReports/TourOperatorListing.aspx';

// Ignore self-signed cert issues (common for some external data sources)
const agent = new https.Agent({
    rejectUnauthorized: false
});

// Heuristic: Cache in-memory for the duration of the server instance
// Note: In Vercel (serverless), this only lasts as long as the lambda is warm.
// Define types for scraper
interface OperatorData {
    id: string;
    name: string;
    phone: string;
    address: {
        full: string;
        district: string;
    };
    email: string;
    website: string;
    district: string;
    location: string;
    category: string;
    priceRange: string;
    rating: string;
}

let cachedOperators: OperatorData[] | null = null;
let lastCacheTime = 0;
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

export async function GET() {
    try {
        // Return cache if valid
        if (cachedOperators && (Date.now() - lastCacheTime < CACHE_DURATION)) {
            return NextResponse.json({
                success: true,
                count: cachedOperators.length,
                data: cachedOperators,
                cached: true
            });
        }

        const allOperators = await scrapeAllPages();

        // Update cache
        cachedOperators = allOperators;
        lastCacheTime = Date.now();

        return NextResponse.json({
            success: true,
            count: allOperators.length,
            data: allOperators,
            cached: false
        });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('Scraping Fatal Error:', message);
        return NextResponse.json({
            success: false,
            message: 'Failed to fetch live data',
            error: message
        }, { status: 500 });
    }
}

async function scrapeAllPages() {
    let operators: OperatorData[] = [];
    let hasNextPage = true;
    let cookies: string | null = null;
    let pageCount = 1;

    // Initial Request (Page 1)
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

        // 2. Extract ASP.NET hidden fields required for pagination
        const viewState = $('#__VIEWSTATE').val() as string | undefined;
        const eventValidation = $('#__EVENTVALIDATION').val() as string | undefined;
        const viewStateGenerator = $('#__VIEWSTATEGENERATOR').val() as string | undefined;

        // 3. Find "Next" button/link logic
        const nextPageNum = pageCount + 1;
        const nextLink = $(`a[href*="Page$${nextPageNum}"]`).first();

        if (nextLink.length > 0) {
            const href = nextLink.attr('href');
            const match = href?.match(/__doPostBack\('([^']+)','([^']+)'\)/);

            if (match) {
                const eventTarget = match[1];
                const eventArgument = match[2];

                // POST request for the next page
                const formData: Record<string, string | undefined> = {
                    __EVENTTARGET: eventTarget,
                    __EVENTARGUMENT: eventArgument,
                    __VIEWSTATE: viewState,
                    __VIEWSTATEGENERATOR: viewStateGenerator,
                    __EVENTVALIDATION: eventValidation
                };

                // Add other inputs
                $('input').each((i, el) => {
                    const name = $(el).attr('name');
                    const val = $(el).val() as string | undefined;
                    if (name && !formData[name] && name !== '__VIEWSTATE' && name !== '__EVENTVALIDATION') {
                        formData[name] = val;
                    }
                });

                response = await axios.post(BTB_URL, qs.stringify(formData), {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Cookie': cookies || '',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                    },
                    httpsAgent: agent
                });

                pageCount++;
                if (response.headers['set-cookie']) {
                    cookies = response.headers['set-cookie'].map(c => c.split(';')[0]).join('; ');
                }
            } else {
                hasNextPage = false;
            }
        } else {
            hasNextPage = false;
        }

        // Safety break
        if (pageCount > 15) hasNextPage = false;
    }

    return operators;
}

function extractOperatorsFromTable($: cheerio.CheerioAPI) {
    const operators: OperatorData[] = [];

    $('tr').each((i, el) => {
        const tds = $(el).find('td');
        if (tds.length < 4) return;

        const name = $(tds[0]).text().trim();
        if (!name || name === 'Name' || name.includes('Company Name')) return;

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
            district: extractDistrict(address),
            location: extractLocation(address),
            category: categorizeOperator(name),
            priceRange: estimatePriceRange(name),
            rating: generateRating()
        });
    });

    return operators;
}

// Helpers
function generateId(name: string) {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10) + Math.floor(Math.random() * 1000);
}

function extractDistrict(address: string) {
    if (!address) return 'Belize';
    const addr = address.toLowerCase();
    if (addr.includes('cayo') || addr.includes('san ignacio') || addr.includes('santa elena') || addr.includes('benque') || addr.includes('bullet tree')) return 'Cayo';
    if (addr.includes('stann') || addr.includes('placencia') || addr.includes('dangriga') || addr.includes('hopkins')) return 'Stann Creek';
    if (addr.includes('corozal')) return 'Corozal';
    if (addr.includes('orange walk')) return 'Orange Walk';
    if (addr.includes('toledo') || addr.includes('punta gorda')) return 'Toledo';
    if (addr.includes('san pedro') || addr.includes('ambergris') || addr.includes('caye caulker') || addr.includes('belize city') || addr.includes('ladyville')) return 'Belize';
    return 'Belize';
}

function extractLocation(address: string) {
    if (!address) return 'Belize';
    const locations = ['San Pedro', 'Caye Caulker', 'San Ignacio', 'Santa Elena', 'Benque', 'Placencia', 'Hopkins', 'Dangriga', 'Belize City', 'Ladyville', 'Corozal', 'Orange Walk', 'Punta Gorda'];
    for (const loc of locations) {
        if (address.toLowerCase().includes(loc.toLowerCase())) return loc;
    }
    return 'Belize';
}

function categorizeOperator(name: string) {
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

function estimatePriceRange(name: string) {
    const n = name.toLowerCase();
    if (n.includes('luxury') || n.includes('resort') || n.includes('heli') || n.includes('private')) return '$$$';
    if (n.includes('dive') || n.includes('adventure')) return '$$';
    return '$';
}

function generateRating() {
    return (4.2 + Math.random() * 0.8).toFixed(1);
}
