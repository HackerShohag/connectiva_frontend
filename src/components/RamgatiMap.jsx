import React, { useState } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEngine } from '../context/EngineContext';
import { Crosshair, ZoomIn, ZoomOut } from 'lucide-react';

// Exact center of Lakshmipur roughly
const LAKSHMIPUR_CENTER = [22.9438, 90.8404];
const LAKSHMIPUR_ZOOM = 9;

const MapControls = () => {
  const map = useMap();
  return (
    <div className="absolute bottom-6 left-6 z-[1001] flex flex-col gap-1.5">
      <button
        onClick={() => map.zoomIn()}
        className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/20 transition-colors border border-slate-500/50"
        style={{ background: 'rgba(15,23,42,0.85)' }}
        title="Zoom in"
      >
        <ZoomIn className="w-4 h-4 text-slate-200" />
      </button>
      <button
        onClick={() => map.zoomOut()}
        className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/20 transition-colors border border-slate-500/50"
        style={{ background: 'rgba(15,23,42,0.85)' }}
        title="Zoom out"
      >
        <ZoomOut className="w-4 h-4 text-slate-200" />
      </button>
      <button
        onClick={() => map.setView(LAKSHMIPUR_CENTER, LAKSHMIPUR_ZOOM)}
        className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/20 transition-colors border border-blue-500/50"
        style={{ background: 'rgba(15,23,42,0.85)' }}
        title="Re-center Lakshmipur"
      >
        <Crosshair className="w-4 h-4 text-blue-400" />
      </button>
    </div>
  );
};

const RamgatiMap = ({ severity, darkMode }) => {
  const { geojsonData } = useEngine();
  const [hovered, setHovered] = useState(false);

  const getStyle = (feature) => {
    const isLakshmipur = feature.properties.NAME_2 === 'Lakshmipur' || feature.properties.name === 'Lakshmipur' || feature.properties.ADM2_EN === 'Lakshmipur';
    
    // In dark mode: base color is very dark slate, stroke is slightly lighter.
    // In light mode: base color is white/off-white, stroke is distinct gray.
    const baseFill = darkMode ? '#1e293b' : '#f8fafc';
    const border = darkMode ? '#334155' : '#cbd5e1';
    
    // For target area: strong blue, with high contrast.
    const highlightFill = darkMode ? '#2563eb' : '#3b82f6';

    return {
      fillColor: isLakshmipur ? highlightFill : baseFill,
      weight: isLakshmipur ? 2 : 1,
      opacity: 1,
      color: isLakshmipur ? (darkMode ? '#60a5fa' : '#2563eb') : border,
      fillOpacity: isLakshmipur ? (darkMode ? 0.8 : 0.9) : (darkMode ? 0.3 : 0.6),
    };
  };

  const onEachFeature = (feature, layer) => {
    const isLakshmipur = feature.properties.NAME_2 === 'Lakshmipur' || feature.properties.name === 'Lakshmipur' || feature.properties.ADM2_EN === 'Lakshmipur';
    
    layer.on({
      mouseover: (e) => {
        const l = e.target;
        if (isLakshmipur) {
          setHovered(true);
          l.setStyle({
            fillColor: darkMode ? '#3b82f6' : '#60a5fa',
            fillOpacity: 1,
            weight: 3,
            color: darkMode ? '#ffffff' : '#1e40af'
          });
          l.bringToFront();
        } else {
          l.setStyle({
            fillOpacity: darkMode ? 0.5 : 0.8,
            fillColor: darkMode ? '#334155' : '#e2e8f0'
          });
        }
      },
      mouseout: (e) => {
        const l = e.target;
        if (isLakshmipur) {
          setHovered(false);
        }
        l.setStyle(getStyle(feature));
      }
    });
  };

  return (
    <div className="w-full h-full relative overflow-hidden" style={{ background: darkMode ? '#0a0f1c' : '#e2e8f0' }}>
      <MapContainer 
        center={LAKSHMIPUR_CENTER} 
        zoom={LAKSHMIPUR_ZOOM} 
        style={{ width: '100%', height: '100%', background: 'transparent' }}
        zoomControl={false}
        scrollWheelZoom={true}
      >
        <MapControls />
        <TileLayer
          url={darkMode ? "https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png" : "https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"}
          attribution='&copy; OpenStreetMap &copy; CARTO'
        />
        {geojsonData && (
          <GeoJSON
            key={darkMode ? 'dark' : 'light'}
            data={geojsonData}
            style={getStyle}
            onEachFeature={onEachFeature}
          />
        )}
        
        {/* Pulse Marker over Lakshmipur */}
        <Marker 
          position={LAKSHMIPUR_CENTER} 
          icon={L.divIcon({
            className: 'custom-div-icon',
            html: `<div class="relative flex h-4 w-4 justify-center items-center">
                    <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span class="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </div>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8]
          })}
        />
      </MapContainer>

      {/* Tooltip Overlay */}
      <div className={`absolute top-4 right-4 p-3 rounded-lg border shadow-lg transition-opacity duration-300 pointer-events-none z-[1002] ${hovered ? 'opacity-100' : 'opacity-0'} ${darkMode ? 'bg-slate-800/90 border-slate-700 text-white' : 'bg-white/90 border-slate-200 text-slate-800'}`}>
        <div className="font-bold text-sm">Ramgati, Lakshmipur</div>
        <div className={`text-xs font-semibold ${severity < 40 ? 'text-red-500' : severity < 70 ? 'text-amber-500' : 'text-emerald-500'}`}>
          Severity Score: {severity.toFixed(1)}/100
        </div>
      </div>
    </div>
  );
};

export default RamgatiMap;
