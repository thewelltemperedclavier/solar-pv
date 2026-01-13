import "mapbox-gl/dist/mapbox-gl.css";
import React from 'react'
import ReactDOM from 'react-dom/client'
import mapboxgl from 'mapbox-gl'
import App from './App.tsx'
import './styles.css'

// Set Mapbox access token globally
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN as string;

// Dev-only warning if token is missing
if (!mapboxgl.accessToken) {
  console.error('Missing VITE_MAPBOX_ACCESS_TOKEN. Ensure .env is in project root and restart dev server.');
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

