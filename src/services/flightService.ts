import axios from 'axios';

// Interfaces based on Amadeus OpenAPI
export interface FlightSearchParams {
    origin: string;
    destination: string;
    departureDate: string;
    returnDate?: string;
    adults: number;
    currency?: string;
}

export interface FlightOffer {
    id: string;
    price: {
        currency: string;
        total: string;
    };
    itineraries: {
        duration: string;
        segments: {
            departure: { iataCode: string; at: string };
            arrival: { iataCode: string; at: string };
            carrierCode: string;
            number: string;
        }[];
    }[];
}

// Amadeus Authentication Response
interface AuthResponse {
    access_token: string;
    expires_in: number;
}

class FlightService {
    private baseUrl = 'https://test.api.amadeus.com/v2'; // or 'https://api.amadeus.com/v2' for prod
    private clientId = process.env.AMADEUS_CLIENT_ID;
    private clientSecret = process.env.AMADEUS_CLIENT_SECRET;
    private accessToken: string | null = null;
    private tokenExpiry: number = 0;

    /**
     * Get or Refresh Access Token
     */
    private async getAccessToken(): Promise<string> {
        if (this.accessToken && Date.now() < this.tokenExpiry) {
            return this.accessToken;
        }

        try {
            const params = new URLSearchParams();
            params.append('grant_type', 'client_credentials');
            params.append('client_id', this.clientId || '');
            params.append('client_secret', this.clientSecret || '');

            const response = await axios.post<AuthResponse>(
                'https://test.api.amadeus.com/v1/security/oauth2/token',
                params,
                {
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
                }
            );

            this.accessToken = response.data.access_token;
            // Set expiry slightly before actual time to be safe (e.g. 5 mins buffer)
            this.tokenExpiry = Date.now() + (response.data.expires_in - 300) * 1000;

            return this.accessToken;
        } catch (error) {
            console.error('Failed to authenticate with Amadeus:', error);
            throw new Error('Authentication failed');
        }
    }

    /**
     * Search for Flights
     */
    async searchFlights(params: FlightSearchParams): Promise<FlightOffer[]> {
        const token = await this.getAccessToken();

        try {
            const response = await axios.get(`${this.baseUrl}/shopping/flight-offers`, {
                headers: {
                    Authorization: `Bearer ${token}`
                },
                params: {
                    originLocationCode: params.origin,
                    destinationLocationCode: params.destination,
                    departureDate: params.departureDate,
                    returnDate: params.returnDate,
                    adults: params.adults,
                    currencyCode: params.currency || 'USD',
                    max: 10 // Limit results for MVP
                }
            });

            return response.data.data;
        } catch (error) {
            console.error('Flight search failed:', error);
            throw error;
        }
    }
}

export const flightService = new FlightService();
