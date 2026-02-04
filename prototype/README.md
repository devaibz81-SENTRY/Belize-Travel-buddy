# Travel Buddy - Live Tour Operator Directory

This application connects to the Belize Tourism Board's live data feed to display tour operators.

## How it Works
1. **Frontend (`index.html`)**: The visual interface.
2. **Proxy Server (`server.js`)**: A small background tool that fetches the live data from the BTB website directly.
3. **API Layer (`api.js`)**: Connects the two.

## How to Run

1. **Start the Data Proxy**:
   Open a terminal in this folder and run:
   ```bash
   node server.js
   ```
   *You should see: "Travel Buddy Live Server running on http://localhost:3000"*

2. **Open the App**:
   Double-click `index.html` to open it in your browser.

## Features
- **Live Data**: No database required. We scrape the latest data every time you load the app.
- **Smart Filters**: Filter by District (Cayo, Belize, etc.), Price, and Rating.
- **WhatsApp Integration**: Click to chat immediately with operators.
