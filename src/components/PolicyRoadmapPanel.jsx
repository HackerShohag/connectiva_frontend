// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
import { useEngine } from '../context/EngineContext';
import { X, TrendingUp, TrendingDown, CheckCircle, Clock, Newspaper, BarChart2, DollarSign, Wifi, Loader, AlertTriangle, ArrowRight, ShieldAlert, Cpu, Activity, Globe, Download } from 'lucide-react';
import { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const PolicyRoadmapPanel = () => {
  const { selectedDistrict, setSelectedDistrict, targetConnectivity, timeframe, mvtWeights, sandboxMultipliers, darkMode, activeYear } = useEngine();
  const [roadmapData, setRoadmapData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [activeTab, setActiveTab] = useState('roadmap');

  useEffect(() => {
    if (!selectedDistrict) return;
    setRoadmapData(null);
    setActiveTab('roadmap');
    fetchRoadmap();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDistrict, activeYear]);

  const fetchRoadmap = async () => {
    setLoading(true);
    try {
      setStatus('📊 Reading historical statistics...');
      await new Promise(r => setTimeout(r, 400));
      setStatus('🔍 Fetching trusted sources...');
      await new Promise(r => setTimeout(r, 300));

      const res = await fetch(`${API_BASE}/api/district-roadmap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          district: selectedDistrict.name,
          target: targetConnectivity,
          timeframe,
          current_connectivity: selectedDistrict.connectivity,
          multipliers: sandboxMultipliers,
          active_year: activeYear
        })
      });

      setStatus('🧠 Generating policy prescription...');
      await new Promise(r => setTimeout(r, 300));
      const data = await res.json();
      setRoadmapData(data);
      setStatus('');
    } catch (err) {
      console.warn('Roadmap backend unavailable:', err);
      setStatus('Backend unavailable. Start setup.sh to load ML+PID district plans.');
      setRoadmapData(null);
    } finally {
      setLoading(false);
    }
  };

  if (!selectedDistrict) return null;

  const isGreen = selectedDistrict.status === 'green';
  const gap = roadmapData ? Math.max(0, roadmapData.gap) : 0;

  return (
    <motion.div
      initial={{ x: 420, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 420, opacity: 0 }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className={`absolute top-0 right-0 w-[420px] h-full z-[2000] flex flex-col shadow-2xl ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}
      style={{ background: darkMode ? 'rgba(10,15,28,0.97)' : 'rgba(250,247,240,0.97)', borderLeft: `1px solid ${darkMode ? 'rgba(59,130,246,0.2)' : 'rgba(59,130,246,0.5)'}` }}
    >
      {/* Floating Close Button at top-right of the screen */}
      <button 
        onClick={() => setSelectedDistrict(null)}
        className={`fixed top-4 right-4 z-[9999] p-2.5 rounded-xl border transition-all shadow-lg ${
          darkMode
            ? 'bg-slate-800 border-slate-600 hover:bg-slate-700'
            : 'bg-[#ede8dc] border-[#c8bfa9] hover:bg-[#e2dcc8]'
        }`}
        title="Close Panel"
      >
        <X className={`w-4 h-4 ${darkMode ? 'text-slate-200' : 'text-slate-700'}`} />
      </button>

      {/* Header */}
      <div className={`p-5 border-b ${darkMode ? 'border-slate-700/50' : 'border-slate-300'}`}>
        <div className="flex justify-between items-start">
          <div>
            <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>{selectedDistrict.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              {roadmapData?.division && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-medium">
                  {roadmapData.division} Division
                </span>
              )}
              {roadmapData?.network_generation && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-medium flex items-center gap-1">
                  <Wifi className="w-3 h-3" />{roadmapData.network_generation}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Score bar */}
        <div className={`mt-3 rounded-xl p-3 border ${darkMode ? 'bg-slate-800/60 border-slate-700/50' : 'bg-slate-100 border-slate-300'}`}>
          <div className="grid grid-cols-3 gap-2 text-center text-xs mb-3">
            <div>
              <div className="text-slate-400 mb-0.5">Current ({activeYear})</div>
              <div className="font-bold text-blue-400">{roadmapData ? roadmapData.current_score.toFixed(1) : selectedDistrict.connectivity.toFixed(1)}%</div>
            </div>
            <div>
              <div className="text-slate-400 mb-0.5">Gap to Target</div>
              <div className={`font-bold text-sm ${gap > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                {gap > 0 ? `${gap.toFixed(1)}% below` : '✓ Met'}
              </div>
            </div>
            <div>
              <div className="text-slate-400 mb-0.5">Target</div>
              <div className="font-bold text-emerald-400">{targetConnectivity}%</div>
            </div>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-1.5">
            <div
              className="h-1.5 rounded-full transition-all duration-700"
              style={{
                width: `${Math.min(100, ((roadmapData ? roadmapData.current_score : selectedDistrict.connectivity) / targetConnectivity) * 100)}%`,
                background: 'linear-gradient(90deg, #3b82f6, #10b981)'
              }}
            />
          </div>
        </div>

        {/* BTRC + NTTN + BTS quick stats */}
        {roadmapData && (
          <div className="grid grid-cols-3 gap-2 mt-3">
            <div className={`rounded-lg p-2 text-xs border ${darkMode ? 'bg-slate-800/40 border-slate-700/30' : 'bg-slate-100 border-slate-300'}`}>
              <div className={`mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Subscribers</div>
              <div className={`font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>{roadmapData.btrc_data?.total_subscribers_m || 'N/A'}M</div>
              <div className={darkMode ? 'text-slate-500' : 'text-slate-600'} title={roadmapData.btrc_data?.operator_basis || ''}>{roadmapData.btrc_data?.dominant_operator || ''} operator signal</div>
            </div>
            <div className={`rounded-lg p-2 text-xs border ${darkMode ? 'bg-slate-800/40 border-slate-700/30' : 'bg-slate-100 border-slate-300'}`}>
              <div className={`mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Fiber (NTTN)</div>
              <div className={`font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>{roadmapData.nttn_data?.ofc_km?.toLocaleString() || 'N/A'} km</div>
              <div className={darkMode ? 'text-slate-500' : 'text-slate-600'}>{roadmapData.nttn_data?.unused_tbps || 0} Tbps unused · {roadmapData.nttn_data?.operators?.length || 0} NTTNs</div>
            </div>
            <div className={`rounded-lg p-2 text-xs border ${darkMode ? 'bg-slate-800/40 border-slate-700/30' : 'bg-slate-100 border-slate-300'}`}>
              <div className={`mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Cell Towers</div>
              {(() => {
                const op = roadmapData.btrc_data?.dominant_operator || 'GP';
                const d = roadmapData.bts_data?.[op];
                const count = d ? (d.BTS_2G + d.NodeB_3G + d.eNodeB_4G).toLocaleString() : 'N/A';
                return (
                  <>
                    <div className={`font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>{count}</div>
                    <div className={darkMode ? 'text-slate-500' : 'text-slate-600'}>{op} Towers (Natl.)</div>
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {roadmapData?.division_context && (
          <div className={`mt-3 rounded-lg p-2.5 text-xs border ${darkMode ? 'bg-blue-950/20 border-blue-500/20' : 'bg-blue-50 border-blue-200'}`}>
            <div className={`font-bold uppercase tracking-wider mb-2 ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>Division-Level Context</div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className={darkMode ? 'text-slate-500' : 'text-slate-500'}>Division</div>
                <div className="font-bold text-blue-500">{roadmapData.division_context.division}</div>
              </div>
              <div>
                <div className={darkMode ? 'text-slate-500' : 'text-slate-500'}>4G Share</div>
                <div className="font-bold text-emerald-500">{roadmapData.division_context.four_g_pct}%</div>
              </div>
              <div>
                <div className={darkMode ? 'text-slate-500' : 'text-slate-500'}>Subscribers</div>
                <div className={`font-bold ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>{roadmapData.division_context.subscribers_m}M</div>
              </div>
            </div>
            <div className={`mt-2 pt-2 border-t grid grid-cols-2 gap-2 ${darkMode ? 'border-slate-700/50 text-slate-500' : 'border-blue-200 text-slate-600'}`}>
              <div>Fiber: <span className="font-bold text-blue-500">{roadmapData.division_context.ofc_km?.toLocaleString()} km</span></div>
              <div>Unused: <span className="font-bold text-blue-500">{roadmapData.division_context.unused_tbps} Tbps</span></div>
              <div>NTTNs: <span className="font-bold text-blue-500">{roadmapData.division_context.nttn_count}</span></div>
              <div>Operator: <span className="font-bold text-blue-500">{roadmapData.division_context.dominant_operator}</span></div>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className={`flex border-b ${darkMode ? 'border-slate-700/50 bg-slate-900/40' : 'border-slate-300 bg-slate-100'}`}>
        {[
          { id: 'roadmap', label: '📋 Plan' },
          { id: 'trends', label: '📈 Trends' },
          { id: 'budget', label: '💰 Budget' },
          { id: 'news', label: '📰 News' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors ${
              activeTab === tab.id
                ? `text-blue-500 border-b-2 border-blue-500 ${darkMode ? 'bg-blue-500/5' : 'bg-blue-50'}`
                : `${darkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700'}`
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">

        {/* Loading */}
        {(loading || status) && (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
            <p className="text-sm text-blue-400 animate-pulse text-center">{status}</p>
          </div>
        )}

        {/* PLAN TAB */}
        {!loading && roadmapData && activeTab === 'roadmap' && (
          <div className="space-y-3">
            {isGreen ? (
              <>
                <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" /> Safe Margin Breakdown
                </h3>
                <div className={`rounded-xl p-3 border ${darkMode ? 'border-emerald-500/20 bg-emerald-900/10' : 'border-emerald-300 bg-emerald-50'}`}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className={darkMode ? 'text-slate-400' : 'text-slate-600'}>District score buffer</span>
                    <span className="font-bold text-emerald-500">+{Math.max(0, (roadmapData.current_score || 0) - targetConnectivity).toFixed(1)} pts</span>
                  </div>
                  <p className={`text-[11px] leading-relaxed ${darkMode ? 'text-slate-500' : 'text-slate-600'}`}>This district is already above target. The values below show how much normalized headroom the model sees at district level, not a national average.</p>
                </div>
                {roadmapData.indicator_trends?.slice(0, 5).map((ind, i) => (
                  <div key={i} className={`rounded-xl p-3 border ${darkMode ? 'border-emerald-500/20 bg-emerald-900/10' : 'border-emerald-300 bg-white'}`}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold text-emerald-500 capitalize">{ind.name}</span>
                      <span className="text-xs font-bold text-emerald-500">
                        Safe +{ind.safe_margin?.toFixed ? ind.safe_margin.toFixed(1) : ind.safe_margin} pts
                      </span>
                    </div>
                    <p className={`text-[11px] leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{ind.plan_summary || ind.natural_language}</p>
                    <div className={`text-[10px] mt-1 flex justify-between ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                      <span>District: {ind.current_value?.toFixed(1)}</span>
                      <span>National ref: {ind.national_value?.toFixed(1)}</span>
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <>
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Future Prediction & Action Plan ({timeframe} Years)
                </h3>
                {roadmapData.indicator_trends?.map((ind, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className={`rounded-xl p-3 border ${darkMode ? 'border-slate-700/40 bg-slate-800/30' : 'border-slate-300 bg-slate-50'}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className={`text-xs font-bold capitalize ${darkMode ? 'text-blue-300' : 'text-blue-600'}`}>{ind.name}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        ind.direction === 'increase' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {ind.direction === 'increase' ? '↑' : '↓'} {Math.abs(ind.change_pct)}%
                      </span>
                    </div>

                    {/* Value change bar — compact, no overlap */}
                    <div className="mb-2">
                      <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                        <span>{ind.current_value >= 1000 ? (ind.current_value/1000).toFixed(1)+'k' : ind.current_value?.toFixed(1)}</span>
                        <span className="text-slate-500">→</span>
                        <span className="text-emerald-400">{ind.target_value >= 1000 ? (ind.target_value/1000).toFixed(1)+'k' : ind.target_value?.toFixed(1)}</span>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-1">
                        <div className="h-1 rounded-full bg-gradient-to-r from-blue-500 to-emerald-500"
                          style={{ width: `${Math.min(100, Math.abs(ind.change_pct))}%` }} />
                      </div>
                    </div>

                    {/* Natural language */}
                    <p className={`text-[11px] leading-relaxed mb-2 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{ind.plan_summary || ind.natural_language}</p>

                    <div className={`text-[10px] border-t pt-1.5 flex justify-between ${darkMode ? 'text-slate-500 border-slate-700/50' : 'text-slate-500 border-slate-300'}`}>
                      <span>Change needed: <span className="text-emerald-300 font-bold">
                        {ind.change > 0 ? '+' : ''}{ind.change?.toFixed(2)} ({ind.change > 0 ? '+' : ''}{ind.change_pct}%)
                      </span></span>
                      <span>National ref: {ind.national_value?.toFixed(1)}</span>
                    </div>
                  </motion.div>
                ))}
              </>
            )}
          </div>
        )}

        {/* TRENDS TAB */}
        {!loading && roadmapData && activeTab === 'trends' && (
          <div className="space-y-2">
            <h3 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
              <BarChart2 className="w-4 h-4 text-blue-500" /> Historical Trends (Recent Years)
            </h3>
            {roadmapData.indicator_trends?.map((ind, i) => {
              const vals = ind.history?.map(h => h.value) || [];
              const max = Math.max(...vals, 1);
              const min = Math.min(...vals, 0);
              const range = max - min || 1;
              const isUp = (ind.recent_delta ?? ind.growth_per_year ?? 0) >= 0;

              return (
                <div key={i} className={`rounded-xl p-2.5 border ${darkMode ? 'border-slate-700/30 bg-slate-800/20' : 'border-slate-300 bg-slate-100'}`}>
                  <div className="flex justify-between items-center mb-1">
                    <span className={`text-xs font-bold capitalize ${darkMode ? 'text-blue-300' : 'text-blue-600'}`}>{ind.name}</span>
                    <span className={`text-[10px] flex items-center gap-1 ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
                      {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {isUp ? '+' : ''}{ind.growth_per_year?.toFixed(3)}/yr
                    </span>
                  </div>
                  <div className="flex gap-0.5 items-end h-10 mb-1">
                    {ind.history?.slice(-10).map((h, j, arr) => {
                      const pct = ((h.value - min) / range) * 100;
                      const isLast = j === arr.length - 1;
                      return (
                        <div key={j} className="flex-1 flex flex-col items-center">
                          <div
                            className={`w-full rounded-sm transition-all ${isLast ? 'bg-emerald-500' : 'bg-blue-500/50'}`}
                            style={{ height: `${Math.max(4, pct)}%` }}
                            title={`${h.year}: ${h.value}`}
                          />
                        </div>
                      );
                    })}
                  </div>
                  <div className={`flex justify-between text-[8px] mb-1 ${darkMode ? 'text-slate-600' : 'text-slate-500'}`}>
                    <span>{ind.history?.[0]?.year}</span>
                    <span>{ind.history?.[ind.history.length - 1]?.year}</span>
                  </div>
                  <div className={`flex justify-between text-[8px] font-bold mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    <span>Start: {vals[0]?.toFixed ? vals[0].toFixed(1) : vals[0]}</span>
                    <span className={ind.recent_delta >= 0 ? 'text-emerald-500' : 'text-red-400'}>Recent: {ind.recent_delta >= 0 ? '+' : ''}{ind.recent_delta}</span>
                    <span>Now: {ind.current_value.toFixed(1)}</span>
                  </div>
                  <p className={`text-[10px] leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{ind.trend_summary || ind.natural_language}</p>
                </div>
              );
            })}
          </div>
        )}

        {/* BUDGET TAB */}
        {!loading && roadmapData && activeTab === 'budget' && (
          <div className="space-y-3">
            <h3 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
              <DollarSign className="w-4 h-4 text-yellow-500" /> Budget Estimation
            </h3>

            {/* Total */}
            <div className={`rounded-xl p-4 border ${darkMode ? 'border-yellow-500/20 bg-yellow-900/10' : 'border-yellow-400/40 bg-yellow-50'}`}>
              <div className="grid grid-cols-2 gap-3 text-center">
                <div>
                  <div className={`text-xs mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Total Cost</div>
                  <div className="text-lg font-bold text-yellow-500">৳{roadmapData.budget?.total_cost_crore} Cr</div>
                  <div className={`text-[10px] ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>${roadmapData.budget?.total_cost_usd_million}M USD</div>
                </div>
                <div>
                  <div className={`text-xs mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Annual Budget</div>
                  <div className="text-lg font-bold text-emerald-500">৳{roadmapData.budget?.annual_budget_crore} Cr</div>
                  <div className={`text-[10px] ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>per year × {timeframe} yrs</div>
                </div>
              </div>
              {roadmapData.budget?.nttn_available_capacity_tbps > 0 && (
                <div className="mt-3 text-[10px] text-blue-300 text-center border-t border-slate-700/50 pt-2">
                  💡 {roadmapData.budget.nttn_available_capacity_tbps} Tbps NTTN capacity available — leverage before new investment
                </div>
              )}
            </div>

            {/* Action items */}
            <h4 className={`text-[10px] font-bold uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Action Breakdown</h4>
            {roadmapData.budget?.actions?.map((action, i) => (
              <div key={i} className={`rounded-lg p-3 border ${action.parallel ? (darkMode ? 'border-blue-500/20 bg-blue-900/10' : 'border-blue-300 bg-blue-50') : (darkMode ? 'border-slate-700/30 bg-slate-800/20' : 'border-slate-300 bg-slate-50')}`}>
                <div className="flex justify-between items-start mb-1">
                  <span className={`text-xs leading-relaxed flex-1 pr-2 ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>{action.action}</span>
                  <span className="text-xs font-bold text-yellow-500 whitespace-nowrap">৳{action.cost_crore} Cr</span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span className={action.parallel ? 'text-blue-400' : 'text-slate-500'}>
                    {action.parallel ? '⚡ Parallel' : '→ Sequential'}
                  </span>
                  <span>~{action.duration_months} months</span>
                </div>
              </div>
            ))}

            <p className="text-[9px] text-slate-600 text-center mt-2">{roadmapData.budget?.note}</p>
          </div>
        )}

        {/* NEWS TAB */}
        {!loading && roadmapData && activeTab === 'news' && (
          <div className="space-y-2">
            <h3 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
              <Newspaper className="w-4 h-4 text-blue-500" /> Intelligence Feed
            </h3>
            {roadmapData.news?.length > 0 ? (
              <div className="max-h-[60vh] overflow-y-auto space-y-2 pr-1 pb-10">
                {roadmapData.news.map((item, i) => (
                  <div key={i} className={`rounded-xl p-3 border ${darkMode ? 'border-slate-700/30 bg-slate-800/20' : 'border-slate-300 bg-white'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        item.tier === 1 ? 'bg-blue-500/20 text-blue-300' :
                        item.tier === 2 ? 'bg-yellow-500/20 text-yellow-300' :
                        'bg-slate-700 text-slate-400'
                      }`}>
                        {item.tier === 1 ? '🏛️' : item.tier === 2 ? '📰' : '🌐'} {item.source}
                      </span>
                      {item.category && (
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${darkMode ? 'bg-slate-700/50 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                          {item.category}
                        </span>
                      )}
                      <span className={`text-[10px] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{item.scraped_at}</span>
                    </div>
                    <p className={`text-xs font-medium leading-relaxed ${darkMode ? 'text-slate-300' : 'text-slate-800'}`}>
                      {item.headline}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className={`p-4 text-center rounded-xl border ${darkMode ? 'border-slate-700/50 bg-slate-800/20' : 'border-slate-300 bg-slate-50'}`}>
                <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>No recent news found for {selectedDistrict.name}.</p>
                <p className="text-xs">Try clicking Generate Analysis first,<br/>then select a district</p>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};
