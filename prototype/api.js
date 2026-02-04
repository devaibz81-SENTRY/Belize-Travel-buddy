/**
 * Travel Buddy API - Live BTB Tour Operator Data
 * Fetches and parses data from Belize Tourism Board
 */

class TravelBuddyAPI {
    constructor() {
        this.baseUrl = 'https://datalink.belizetourismboard.org:8443/BtbWebReports/TourOperatorListing.aspx';
        this.operators = [];
        this.cache = {
            data: null,
            timestamp: null,
            expiryMinutes: 30
        };
    }

    /**
     * Parse operator data from BTB format
     * Fields: Name, Phone, Address, Email, Website
     */
    parseOperatorData(rawText) {
        const operators = [];
        const lines = rawText.split('\n');

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            // Parse tab-separated values
            const parts = line.split('\t');
            if (parts.length >= 4) {
                const operator = {
                    id: this.generateId(parts[0]),
                    name: parts[0].trim(),
                    phone: this.formatPhone(parts[1]),
                    address: this.parseAddress(parts[2]),
                    email: parts[3].trim(),
                    website: parts[4] ? parts[4].trim() : '',
                    district: this.extractDistrict(parts[2]),
                    location: this.extractLocation(parts[2]),
                    category: this.categorizeOperator(parts[0]),
                    rating: this.generateRating(), // Placeholder for future integration
                    priceRange: this.estimatePriceRange(parts[0])
                };

                operators.push(operator);
            }
        }

        return operators;
    }

    /**
     * Extract district from address
     * Districts: Belize, Cayo, Orange Walk, Corozal, Stann Creek, Toledo
     */
    extractDistrict(address) {
        const districts = ['Cayo', 'Belize', 'Orange Walk', 'Corozal', 'Stann Creek', 'Toledo'];
        const addressLower = address.toLowerCase();

        for (const district of districts) {
            if (addressLower.includes(district.toLowerCase())) {
                return district;
            }
        }

        // Check for specific towns/villages
        if (addressLower.includes('san ignacio') || addressLower.includes('santa elena') ||
            addressLower.includes('benque') || addressLower.includes('bullet tree')) {
            return 'Cayo';
        }
        if (addressLower.includes('san pedro') || addressLower.includes('ambergris')) {
            return 'Belize';
        }
        if (addressLower.includes('placencia') || addressLower.includes('dangriga') ||
            addressLower.includes('hopkins')) {
            return 'Stann Creek';
        }

        return 'Unknown';
    }

    /**
     * Extract specific location/town from address
     */
    extractLocation(address) {
        const locations = [
            'San Pedro', 'Caye Caulker', 'Belize City', 'San Ignacio', 'Santa Elena',
            'Placencia', 'Dangriga', 'Hopkins', 'Punta Gorda', 'Corozal Town',
            'Orange Walk Town', 'Benque Viejo', 'Bullet Tree', 'Ladyville'
        ];

        for (const location of locations) {
            if (address.toLowerCase().includes(location.toLowerCase())) {
                return location;
            }
        }

        return this.extractDistrict(address);
    }

    /**
     * Categorize operator based on name keywords
     */
    categorizeOperator(name) {
        const nameLower = name.toLowerCase();

        if (nameLower.includes('div') || nameLower.includes('snorkel') ||
            nameLower.includes('reef') || nameLower.includes('underwater')) {
            return 'diving';
        }
        if (nameLower.includes('mayan') || nameLower.includes('maya') ||
            nameLower.includes('ruin') || nameLower.includes('cultural')) {
            return 'mayan';
        }
        if (nameLower.includes('resort') || nameLower.includes('hotel') ||
            nameLower.includes('lodge') || nameLower.includes('spa')) {
            return 'resort';
        }
        if (nameLower.includes('adventure') || nameLower.includes('cave') ||
            nameLower.includes('zip') || nameLower.includes('jungle') ||
            nameLower.includes('expedition')) {
            return 'adventure';
        }
        if (nameLower.includes('fish') || nameLower.includes('angl')) {
            return 'fishing';
        }
        if (nameLower.includes('bird') || nameLower.includes('wildlife') ||
            nameLower.includes('nature')) {
            return 'nature';
        }

        return 'general';
    }

    /**
     * Estimate price range based on operator type
     */
    estimatePriceRange(name) {
        const nameLower = name.toLowerCase();

        if (nameLower.includes('resort') || nameLower.includes('spa') ||
            nameLower.includes('luxury') || nameLower.includes('helicopter')) {
            return '$$$';
        }
        if (nameLower.includes('dive') || nameLower.includes('diving') ||
            nameLower.includes('expedition')) {
            return '$$';
        }

        return '$';
    }

    /**
     * Generate rating (placeholder - can be enhanced with real reviews)
     */
    generateRating() {
        return (4.0 + Math.random() * 1.0).toFixed(1);
    }

    /**
     * Format phone number
     */
    formatPhone(phone) {
        const cleaned = phone.replace(/\D/g, '');
        if (cleaned.length === 7) {
            return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
        }
        return phone;
    }

    /**
     * Parse address into structured format
     */
    parseAddress(address) {
        const parts = address.split(',').map(p => p.trim()).filter(p => p);
        return {
            full: address,
            street: parts[0] || '',
            city: parts[1] || '',
            district: parts[2] || ''
        };
    }

    /**
     * Generate unique ID from name
     */
    generateId(name) {
        return name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    }

    /**
     * Fetch live data from our local proxy server
     */
    async fetchLiveData() {
        // Check cache first (client side cache)
        if (this.isCacheValid()) {
            console.log('Using cached data');
            return this.cache.data;
        }

        try {
            console.log('Connecting to Live Server...');
            const response = await fetch('http://localhost:3000/api/operators');
            const result = await response.json();

            if (result.success && result.data.length > 0) {
                console.log(`Loaded ${result.data.length} operators from live source.`);
                this.cache.data = result.data;
                this.cache.timestamp = Date.now();
                return result.data;
            } else {
                throw new Error('No data received from live feed');
            }
        } catch (error) {
            console.error('Live Fetch Error:', error); // Log generic error
            console.warn('Falling back to emergency local data...');
            return this.loadFallbackData();
        }
    }

    /**
     * Fallback data only used if the server is offline
     */
    loadFallbackData() {
        // A minimal list just so the app doesn't look broken if server is off
        return [
            {
                id: 'fallback-1',
                name: "System Offline - Start Server",
                phone: "000-0000",
                address: { full: "Run 'node server.js' to see live data", street: "", city: "", district: "System" },
                district: "System",
                location: "Console",
                category: "System",
                priceRange: "$",
                rating: 0
            }
        ];
    }

    /**
     * Check if cache is still valid
     */
    isCacheValid() {
        if (!this.cache.data || !this.cache.timestamp) {
            return false;
        }

        const now = Date.now();
        const expiryMs = this.cache.expiryMinutes * 60 * 1000;
        return (now - this.cache.timestamp) < expiryMs;
    }

    /**
     * Get all operators
     */
    async getAllOperators() {
        return await this.fetchLiveData();
    }

    /**
     * Filter operators by criteria
     */
    filterOperators(operators, filters) {
        let filtered = [...operators];

        // Category filter
        if (filters.category && filters.category !== 'all') {
            filtered = filtered.filter(op => op.category === filters.category);
        }

        // District filter
        if (filters.district && filters.district !== 'all') {
            filtered = filtered.filter(op => op.district === filters.district);
        }

        // Location filter
        if (filters.location && filters.location !== 'all') {
            filtered = filtered.filter(op => op.location === filters.location);
        }

        // Price range filter
        if (filters.priceRange && filters.priceRange !== 'all') {
            filtered = filtered.filter(op => op.priceRange === filters.priceRange);
        }

        // Rating filter
        if (filters.minRating) {
            filtered = filtered.filter(op => parseFloat(op.rating) >= filters.minRating);
        }

        // Search query
        if (filters.search) {
            const query = filters.search.toLowerCase();
            filtered = filtered.filter(op =>
                op.name.toLowerCase().includes(query) ||
                op.address.full.toLowerCase().includes(query) ||
                op.email.toLowerCase().includes(query) ||
                op.district.toLowerCase().includes(query) ||
                op.location.toLowerCase().includes(query)
            );
        }

        return filtered;
    }

    /**
     * Get unique districts from operators
     */
    getDistricts(operators) {
        const districts = new Set(operators.map(op => op.district));
        return Array.from(districts).sort();
    }

    /**
     * Get unique locations from operators
     */
    getLocations(operators) {
        const locations = new Set(operators.map(op => op.location));
        return Array.from(locations).sort();
    }

    /**
     * Get operators by district
     */
    getOperatorsByDistrict(operators, district) {
        return operators.filter(op => op.district === district);
    }

    /**
     * Get WhatsApp link for operator
     */
    getWhatsAppLink(phone, operatorName) {
        const cleanPhone = phone.replace(/\D/g, '');
        const message = encodeURIComponent(`Hi! I found you on Travel Buddy Belize. I'm interested in learning more about ${operatorName}.`);
        return `https://wa.me/501${cleanPhone}?text=${message}`;
    }
}

// Export API instance
const travelBuddyAPI = new TravelBuddyAPI();
