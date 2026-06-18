# Connectiva Frontend

The Connectiva frontend is a React-based interactive dashboard built with Vite and TailwindCSS. It provides high-performance data visualizations and user interfaces to analyze telecommunication infrastructure, compute rural digital divide metrics, and generate district-level policy roadmaps.

## Architecture & Tech Stack

- **Framework**: React 18
- **Build Tool**: Vite (Lightning fast HMR & builds)
- **Styling**: TailwindCSS (Utility-first framework)
- **Data Visualization**: Recharts (Composable charting library built on React components)
- **Icons**: Lucide React

## Project Structure

```
frontend/
├── public/                 # Static assets
├── scripts/                # Pre-development python processing scripts
├── src/
│   ├── components/         # Reusable UI components and complex panels
│   │   ├── EngineerView.jsx            # Drag-and-drop file upload & ML analysis
│   │   ├── PolicyRoadmapPanel.jsx      # Roadmap generation with PID-controller logic
│   │   ├── WorldDataComparison.jsx     # Global and regional connectivity benchmarking
│   │   └── ReportGenerationPanel.jsx   # Scientific and summary report export UI
│   ├── context/
│   │   └── EngineContext.jsx           # Global state management and API communication hub
│   ├── utils/
│   │   └── engine.js                   # Client-side math helpers (PID controller, CSV parsing, 45% gap rule)
│   ├── App.jsx                 # Application entrypoint
│   └── main.jsx                # React root renderer
├── index.html              # HTML template
├── package.json            # NPM dependencies and scripts
├── tailwind.config.js      # Tailwind theme configuration
└── vite.config.js          # Vite configuration
```

## Environment Setup

The application communicates with the Connectiva backend API. You must configure the API URL so the frontend knows where to send requests.

1. Create a `.env` file in the root of the `frontend` directory.
2. Add the following variable:
   ```env
   VITE_API_URL=http://localhost:5000
   ```
   *(Note: In production deployments like Vercel, this variable should be set in your hosting provider's dashboard to point to your live backend domain, or left empty if they share the same origin).*

## Running Locally

1. **Install Dependencies**
   Ensure you have Node.js 20+ installed, then run:
   ```bash
   npm install
   ```

2. **Start the Development Server**
   ```bash
   npm run dev
   ```
   The application will start at `http://localhost:5173/` and feature hot-module replacement (HMR).

## Production Build

To compile the application for production deployment:

```bash
npm run build
```
This generates optimized static files in the `dist/` directory, which can be served by any static file host (e.g., Vercel, Netlify, NGINX).

## Key Features

- **Interactive Geo-mapping Context**: Renders district-level statistics pulling from national trends.
- **Dynamic Policy Roadmaps**: Leverages a client-side PID (Proportional-Integral-Derivative) controller in `engine.js` to simulate timeframe-based infrastructure growth over 1-15 years.
- **Data Uploading**: Accepts CSV, Excel, and JSON datasets, securely piping them to the Flask backend's `DataVerifier` pipeline.
- **Global Benchmarking**: Compares Bangladesh's core digital indicators (4G Availability, Internet Access, Digital Literacy) against immediate regional peers and global averages.
