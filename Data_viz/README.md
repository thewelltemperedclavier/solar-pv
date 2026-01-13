# Follow the Subsidy

An interactive map exploring how California solar incentives are distributed across ZIP codes, with a focus on equity and low-income access.

## Features

- **Interactive Map**: Explore California ZIP codes with choropleth visualization
- **Multiple Metrics**: Switch between Total Subsidy, Low-Income Subsidy, and Equity Share
- **Dynamic Filtering**: Use slider to filter ZIP codes by threshold value
- **Detailed Stats**: Click on any ZIP code to see detailed statistics
- **Data Visualizations**: Histogram and donut chart showing distribution and breakdown

## Setup

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up your Mapbox access token:
   - Create a `.env` file in the project root
   - Add your Mapbox access token:
   ```
   VITE_MAPBOX_ACCESS_TOKEN=your_token_here
   ```
   - Get a free token at [mapbox.com](https://account.mapbox.com/access-tokens/)

### Running the App

```bash
npm run dev
```

The app will be available at `http://localhost:5173` (or the port shown in the terminal).

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Data Files

Data files are located in `src/data/`:

- `ca_zips.geojson`: California ZIP Code Tabulation Areas (ZCTAs) GeoJSON
- `california_solar_subsidy_by_zip.csv`: Solar subsidy data by ZIP code

### Data Join Logic

The app joins CSV data to GeoJSON features using the ZIP code field:
- GeoJSON field: `feature.properties.ZCTA5CE10` (5-digit string)
- CSV field: `ZIP` (5-digit string)
- ZIP codes are normalized using `padStart(5, '0')` to ensure consistent formatting

ZIP codes without matching CSV data will be displayed with low opacity (0.1) on the map.

## Project Structure

```
src/
 ├─ App.tsx                # Main app component
 ├─ main.tsx               # Entry point
 ├─ data/
 │   ├─ ca_zips.geojson
 │   └─ california_solar_subsidy_by_zip.csv
 ├─ components/
 │   ├─ MapView.tsx        # Mapbox map component
 │   ├─ SidePanel.tsx      # Right-side control panel
 │   ├─ Legend.tsx         # Color legend
 │   ├─ Histogram.tsx      # Distribution histogram
 │   └─ Donut.tsx          # Subsidy breakdown chart
 ├─ utils/
 │   ├─ loadData.ts        # Data loading and joining
 │   └─ format.ts          # Formatting utilities
 └─ styles.css             # Global styles
```

## Usage

1. **Select a Metric**: Use the tabs at the top of the side panel to switch between:
   - Total Subsidy (green scale)
   - Low-Income Subsidy (purple scale)
   - Equity Share (diverging red-yellow-blue scale)

2. **Filter ZIP Codes**: Use the slider to filter ZIP codes. ZIP codes below the threshold will fade out.

3. **Explore**: 
   - Hover over ZIP codes to see their values
   - Click on a ZIP code to see detailed statistics in the side panel
   - View the histogram to see the distribution of the selected metric
   - Check the donut chart to see the breakdown of low-income vs other subsidies

## Technologies

- **React 18** with TypeScript
- **Vite** for build tooling
- **Mapbox GL JS** for interactive mapping
- **PapaParse** for CSV parsing
- **CSS** for styling (no framework dependencies)

## License

MIT
