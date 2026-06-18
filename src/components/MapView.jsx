import { useEngine } from '../context/EngineContext';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { generateRoadmap } from '../utils/engine';
import { useEffect, useState } from 'react';
import { Crosshair, ZoomIn, ZoomOut } from 'lucide-react';

const BGD_CENTER = [23.6850, 90.3563];
const BGD_ZOOM = 7;

// Exact colors per spec
const COLORS = {
  red:     { normal: '#ff0000', blink: '#ff4d00' },
  yellow:  { normal: '#ff9a00', blink: '#ffc100' },
  green:   { normal: '#34c62c', blink: '#8ce03a' },
  default: '#64748b',
};

// Map controls — bottom left, beside legend
const MapControls = ({ darkMode }) => {
  const map = useMap();
  const bg = darkMode ? 'rgba(15,23,42,0.85)' : 'rgba(255,255,255,0.9)';
  const hover = darkMode ? 'hover:bg-white/20' : 'hover:bg-slate-200';
  const border = darkMode ? 'border-slate-500/50' : 'border-slate-300';
  const icon = darkMode ? 'text-slate-200' : 'text-slate-700';

  return (
    <div className="absolute bottom-6 left-6 z-[1001] flex flex-col gap-1.5">
      <button
        onClick={() => map.zoomIn()}
        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors border ${hover} ${border}`}
        style={{ background: bg }}
        title="Zoom in"
      >
        <ZoomIn className={`w-4 h-4 ${icon}`} />
      </button>
      <button
        onClick={() => map.zoomOut()}
        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors border ${hover} ${border}`}
        style={{ background: bg }}
        title="Zoom out"
      >
        <ZoomOut className={`w-4 h-4 ${icon}`} />
      </button>
      <button
        onClick={() => map.setView(BGD_CENTER, BGD_ZOOM)}
        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors border border-blue-500/50 ${hover}`}
        style={{ background: bg }}
        title="Re-center Bangladesh"
      >
        <Crosshair className="w-4 h-4 text-blue-500" />
      </button>
    </div>
  );
};

export const MapView = () => {
  const {
    geojsonData, districtData, selectedDistrict,
    setSelectedDistrict, targetConnectivity, timeframe,
    mvtWeights, setRoadmap, analysisComplete, priorityDistricts, darkMode,
    activeYear, setActiveYear
  } = useEngine();

  const [blinkOn, setBlinkOn] = useState(true);
  const [selectedBlink, setSelectedBlink] = useState(false);
  const [selectedBlinkActive, setSelectedBlinkActive] = useState(false);
  const geoJsonKey = `${blinkOn}-${selectedBlink}-${selectedBlinkActive}-${activeYear}-${selectedDistrict?.name}-${analysisComplete}-${darkMode}`;

  // Priority blink — only after analysis, 3 sec interval
  useEffect(() => {
    if (!analysisComplete) return;
    const interval = setInterval(() => setBlinkOn(p => !p), 3000);
    return () => clearInterval(interval);
  }, [analysisComplete]);

  // Selected district blink — 5 sec delay, then blink
  useEffect(() => {
    if (!selectedDistrict) {
      setTimeout(() => {
        setSelectedBlinkActive(false);
        setSelectedBlink(false);
      }, 0);
      return;
    }
    setTimeout(() => {
      setSelectedBlinkActive(false);
      setSelectedBlink(false);
    }, 0);
    const delay = setTimeout(() => {
      setSelectedBlinkActive(true);
    }, 5000);
    return () => clearTimeout(delay);
  }, [selectedDistrict]);

  useEffect(() => {
    if (!selectedBlinkActive) return;
    const interval = setInterval(() => setSelectedBlink(p => !p), 1000);
    return () => clearInterval(interval);
  }, [selectedBlinkActive]);



  const getSimulatedStatus = (baseConn, year) => {
    const mod = year === 2022 ? 0.78 : year === 2023 ? 0.86 : year === 2024 ? 0.94 : 1.0;
    const effConn = baseConn * mod;
    let status = 'red';
    if (effConn >= targetConnectivity) status = 'green';
    else if (effConn >= targetConnectivity * 0.55) status = 'yellow';
    return { effConn, status };
  };

  const getStyle = (feature) => {
    const name = feature.properties.NAME_2 || feature.properties.ADM2_EN || feature.properties.name;
    const data = districtData.find(d => d.name === name);
    const isSelected = selectedDistrict?.name === name;
    const isPriority = analysisComplete && priorityDistricts.has(name);

    if (!data) return {
      fillColor: COLORS.default,
      weight: 1, opacity: 1,
      color: '#000000',
      fillOpacity: 0.7
    };

    const { status } = getSimulatedStatus(data.connectivity, activeYear);
    const palette = COLORS[status] || { normal: COLORS.default, blink: COLORS.default };

    // Selected district — thick black border, blink after 5s delay
    if (isSelected) {
      const fillColor = selectedBlinkActive
        ? (selectedBlink ? palette.blink : palette.normal)
        : palette.normal;
      return {
        fillColor,
        weight: 3,
        opacity: 1,
        color: '#000000',
        fillOpacity: 0.9,
      };
    }

    // Priority districts — blink color but BLACK border always
    if (isPriority) {
      const fillColor = blinkOn ? palette.blink : palette.normal;
      return {
        fillColor,
        weight: 1.5,
        opacity: 1,
        color: '#000000',
        fillOpacity: 0.78,
      };
    }

    // Normal
    return {
      fillColor: palette.normal,
      weight: 1,
      opacity: 1,
      color: '#000000',
      fillOpacity: 0.72,
    };
  };

  const handleDistrictClick = (feature) => {
    const name = feature.properties.NAME_2 || feature.properties.ADM2_EN || feature.properties.name || "Unknown";
    const data = districtData.find(d => d.name === name);
    if (data) {
      setSelectedDistrict(data);
      setRoadmap(generateRoadmap(data, targetConnectivity, timeframe, mvtWeights));
    }
  };

  const onEachFeature = (feature, layer) => {
    const name = feature.properties.NAME_2 || feature.properties.ADM2_EN || feature.properties.name;
    const data = districtData.find(d => d.name === name);
    const isPriority = analysisComplete && priorityDistricts.has(name);
    const isSelected = selectedDistrict?.name === name;

    const sim = data ? getSimulatedStatus(data.connectivity, activeYear) : null;

    layer.bindTooltip(
      `<b>${name}</b>${data ? `<br/>Connectivity (${activeYear}): ${sim.effConn.toFixed(1)}%<br/>Status: ${sim.status?.toUpperCase()}` : ''}${isPriority ? '<br/><span style="color:#ffc100">⚡ Priority Focus</span>' : ''}${isSelected ? '<br/><span style="color:#60a5fa">● Selected</span>' : ''}`,
      { direction: 'auto', sticky: false }
    );

    layer.on({
      mouseover: (e) => {
        if (selectedDistrict?.name !== name) {
          e.target.setStyle({ weight: 2.5, color: '#3b82f6', fillOpacity: 0.92 });
          e.target.bringToFront();
        }
      },
      mouseout: (e) => { e.target.setStyle(getStyle(feature)); },
      click: () => handleDistrictClick(feature)
    });
  };
  if (!geojsonData) return <div className="text-white p-6">Loading Geospatial Data...</div>;

  // National computations
  const nationalAvgConnectivity = districtData?.length > 0 
    ? districtData.reduce((acc, curr) => acc + curr.connectivity, 0) / districtData.length 
    : 0;
  
  const totalNationalGap = districtData?.length > 0
    ? districtData.reduce((acc, d) => acc + Math.max(0, targetConnectivity - d.connectivity), 0)
    : 0;
    
  const totalNationalBudget = totalNationalGap * 15 * timeframe;
  const annualNationalBudget = totalNationalGap * 15;

  return (
    <div className="flex h-full w-full relative">
      <div className="flex-1 w-full h-full relative" style={{ zIndex: 1 }}>
        <MapContainer
          center={BGD_CENTER} zoom={BGD_ZOOM}
          scrollWheelZoom={true} dragging={true}
          style={{ height: '100%', width: '100%', background: darkMode ? '#0a0f1c' : '#f5f0e8' }}
          zoomControl={false}
        >
          <TileLayer
            url={darkMode ? "https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png" : "https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"}
            attribution='&copy; OpenStreetMap &copy; CARTO'
          />
          <GeoJSON
            key={`${geoJsonKey}-${darkMode}`}
            data={geojsonData}
            style={getStyle}
            onEachFeature={onEachFeature}
          />
          <MapControls darkMode={darkMode} />
        </MapContainer>

        {/* Legend + controls side by side bottom left */}
        <div className="absolute bottom-6 left-16 z-[1000] flex items-stretch gap-4 pointer-events-none">
          {/* Connectivity Status Box */}
          <div className={`p-4 rounded-xl text-sm border shadow-lg pointer-events-auto flex flex-col justify-between ${darkMode ? 'glass-panel border-slate-700/50' : 'bg-white/90 border-slate-300'}`}
               style={{ background: darkMode ? 'rgba(10,15,28,0.88)' : 'rgba(255,255,255,0.9)' }}>
            <div>
              <h3 className={`font-bold mb-3 text-xs uppercase tracking-wider ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>Connectivity Status</h3>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3.5 h-3.5 rounded-sm" style={{ background: COLORS.red.normal, boxShadow: `0 0 8px ${COLORS.red.normal}88` }}></div>
                <span className={`text-xs ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>Critical (below 55% of target)</span>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3.5 h-3.5 rounded-sm" style={{ background: COLORS.yellow.normal, boxShadow: `0 0 8px ${COLORS.yellow.normal}88` }}></div>
                <span className={`text-xs ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>Transitioning (55–99%)</span>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3.5 h-3.5 rounded-sm" style={{ background: COLORS.green.normal, boxShadow: `0 0 8px ${COLORS.green.normal}88` }}></div>
                <span className={`text-xs ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>Target Met (≥ target)</span>
              </div>
            </div>
            <div>
              {analysisComplete && priorityDistricts.size > 0 && (
                <div className={`border-t pt-2 flex items-center gap-2 text-xs ${darkMode ? 'border-slate-700 text-yellow-400' : 'border-slate-300 text-yellow-600'}`}>
                  <div className="w-3 h-3 rounded-sm animate-pulse" style={{ background: COLORS.yellow.blink }}></div>
                  <span>Blinking = {priorityDistricts.size} Priority Districts</span>
                </div>
              )}
              {selectedDistrict && (
                <div className={`border-t pt-2 mt-2 flex items-center gap-2 text-xs ${darkMode ? 'border-slate-700 text-blue-400' : 'border-slate-300 text-blue-600'}`}>
                  <div className="w-3 h-3 rounded-sm border-2 border-black" style={{ background: COLORS[selectedDistrict.status]?.normal }}></div>
                  <span>{selectedDistrict.name} selected</span>
                </div>
              )}
            </div>
          </div>

          {/* National Metrics Box */}
          <div className={`p-4 rounded-xl text-sm border shadow-lg pointer-events-auto flex flex-col justify-between w-64 ${darkMode ? 'glass-panel border-slate-700/50' : 'bg-white/90 border-slate-300'}`}
               style={{ background: darkMode ? 'rgba(10,15,28,0.88)' : 'rgba(255,255,255,0.9)' }}>
            <div>
              <h3 className={`font-bold mb-3 text-xs uppercase tracking-wider ${darkMode ? 'text-blue-300' : 'text-blue-600'}`}>National Trends & Scope</h3>
              <div className="space-y-3">
                <div>
                  <div className={`text-[10px] uppercase font-bold tracking-wider mb-1 ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>Target Milestones</div>
                  <div className={`text-xs ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Connect <span className="text-blue-500 font-bold">{targetConnectivity}%</span> in <span className="text-blue-500 font-bold">{timeframe} Years</span></div>
                </div>
                <div>
                  <div className={`text-[10px] uppercase font-bold tracking-wider mb-1 ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>National Averages</div>
                  <div className={`text-xs ${darkMode ? 'text-slate-300' : 'text-slate-700'} flex justify-between`}>
                    <span>Current: <span className="font-bold">{nationalAvgConnectivity.toFixed(1)}%</span></span>
                    <span>Gap Sum: <span className="text-amber-500 font-bold">{totalNationalGap.toFixed(1)}</span></span>
                  </div>
                </div>
                <div>
                  <div className={`text-[10px] uppercase font-bold tracking-wider mb-1 ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>Required Budget Projection</div>
                  <div className={`text-xs ${darkMode ? 'text-slate-300' : 'text-slate-700'} flex flex-col gap-0.5`}>
                    <span className="flex justify-between">Total: <span className="text-emerald-500 font-bold">৳{(totalNationalBudget/1000).toFixed(1)}k Cr</span></span>
                    <span className="flex justify-between">Annual: <span className="text-emerald-500 font-bold">৳{(annualNationalBudget/1000).toFixed(1)}k Cr</span></span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className={`border-t pt-2 mt-2 flex items-center gap-2 text-xs ${darkMode ? 'border-slate-700' : 'border-slate-300'}`}>
               <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>Select a district on the map for micro-plans.</span>
            </div>
          </div>
        </div>

        {/* Priority badge top */}
        {analysisComplete && priorityDistricts.size > 0 && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] px-4 py-1.5 rounded-full text-xs border border-yellow-500/30"
               style={{ background: 'rgba(10,15,28,0.85)' }}>
            <span className="text-yellow-400 font-bold">⚡ {priorityDistricts.size} districts</span>
            <span className="text-slate-400"> prioritized for {timeframe}-year goal</span>
          </div>
        )}

        {/* Timeline Controls (Top Right) */}
        {analysisComplete && (
          <div className={`absolute top-6 z-[1000] p-1.5 rounded-xl border border-blue-500/30 shadow-xl flex items-center gap-1 backdrop-blur-md transition-all duration-300 ${selectedDistrict ? 'right-[440px]' : 'right-6'}`}
               style={{ background: darkMode ? 'rgba(10,15,28,0.85)' : 'rgba(255,255,255,0.9)' }}>
            <span className={`text-[10px] font-bold px-2 uppercase tracking-wide ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Train DB</span>
            {[2022, 2023, 2024, 2025].map(y => (
              <button
                key={y}
                onClick={() => setActiveYear(y)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeYear === y 
                  ? 'bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.5)]' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {y}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
