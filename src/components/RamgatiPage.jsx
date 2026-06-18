import React, { useState, Suspense } from 'react';
import { useEngine } from '../context/EngineContext';
import processedData from '../../data/ramgati_data/ramgati_processed.json';
import { ShieldAlert, ArrowRight, Activity, MapPin, X, CheckCircle } from 'lucide-react';

const RamgatiMap = React.lazy(() => import('./RamgatiMap'));

export const RamgatiPage = () => {
  const { darkMode, targetConnectivity, districtData } = useEngine();

  // Find Lakshmipur in the live ML engine data to extract live score if needed for context,
  // but strictly DO NOT manipulate the raw survey baseline data!
  const lakshmipurData = districtData.find(d => d.name === 'Lakshmipur');
  const liveLakshmipurScore = lakshmipurData ? lakshmipurData.connectivity : 45.0;

  const [data] = useState(processedData || null);

  // Keep dimensions strictly mapped to the true field survey
  const unmanipulatedDimensions = React.useMemo(() => processedData ? { ...processedData.dimensions } : {}, []);

  const [goals, setGoals] = useState(unmanipulatedDimensions);
  const [showPolicy, setShowPolicy] = useState(false);

  // Sync simulator starting goals with the global target Connectivity
  React.useEffect(() => {
    if (processedData) {
      const newGoals = {};
      Object.keys(unmanipulatedDimensions).forEach(key => {
        // Set goal to the higher of the true survey current value or the global target
        newGoals[key] = Math.max(unmanipulatedDimensions[key], targetConnectivity);
      });
      setGoals(newGoals);
      setShowPolicy(false);
    }
  }, [targetConnectivity, unmanipulatedDimensions]);

  if (!data) return (
    <div className="p-8 text-center text-slate-400">
      Run npm run process-ramgati first
    </div>
  );

  const { targets, severity_score, feature_weights, raw } = data;
  const dimensions = unmanipulatedDimensions; // Strict adherence to field survey

  const handleSliderChange = (key, val) => {
    let newVal = Math.max(dimensions[key], parseFloat(val));
    let newGoals = { ...goals, [key]: newVal };

    // Dependency logic
    if (key === 'internet_access') {
      newGoals['infrastructure'] = Math.max(newGoals['infrastructure'], newVal * 0.93);
      newGoals['throughput_ul'] = Math.max(newGoals['throughput_ul'], newVal * 0.80);
      newGoals['gender_inclusion'] = Math.max(newGoals['gender_inclusion'], newVal * 0.64);
      newGoals['signal_quality'] = Math.max(newGoals['signal_quality'], newVal * 0.85);

      // Ensure we don't drop below current values for dependents either
      newGoals['infrastructure'] = Math.max(dimensions['infrastructure'], newGoals['infrastructure']);
      newGoals['throughput_ul'] = Math.max(dimensions['throughput_ul'], newGoals['throughput_ul']);
      newGoals['gender_inclusion'] = Math.max(dimensions['gender_inclusion'], newGoals['gender_inclusion']);
      newGoals['signal_quality'] = Math.max(dimensions['signal_quality'], newGoals['signal_quality']);
    }

    setGoals(newGoals);
    setShowPolicy(false);
  };

  const bg = darkMode ? 'bg-[#0f1117]' : 'bg-[#f5f0e8]';
  const text = darkMode ? 'text-slate-200' : 'text-slate-800';
  const cardBg = darkMode ? 'bg-[#161b27]' : 'bg-white';
  const borderCol = darkMode ? 'border-[#1e2a3a]' : 'border-[#d4cbb8]';

  const formatName = (key) => key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  const getBarColor = (gap) => {
    if (gap > 40) return 'bg-red-500';
    if (gap >= 20) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  // Section D logic: templates stay evidence-based, while selection/ranking remains engine-driven.
  const policies = {
    internet_access: {
      framework: "ITU-D Resolution 34 · BTRC Universal Service Obligation",
      text: "Ramgati is a usage desert more than a pure coverage desert: 58.2% access leaves roughly 124,000 residents offline, with cost, coverage, and skills as the main stated barriers.",
      evidence: ["58.2% internet access baseline", "Cost barrier reported by 31% of offline respondents", "BPL households spend 8-15% of income on 2 GB mobile data"],
      interventions: ["Mandate zone-wise rural/remote tariff tiers with separate rural and char island reporting", "Pilot a BDT 100/month social data inclusion voucher for 5 GB on verified low-income SIMs", "Zero-rate core public service and education portals, with operator reimbursement tied to verified usage"],
      rank: 4,
      gapReq: 15
    },
    infrastructure: {
      framework: "BTRC USO · Shared passive infrastructure · Resilient char connectivity",
      text: "The tower layer is adequate on mainland clusters but weak for char and river-edge settlements, so the recommendation should trigger only when the infrastructure target rises above the survey baseline.",
      evidence: ["66 4G towers in the processed Ramgati inventory", "31 towers/100 km2 vs national planning reference near 50", "Char settlements face seasonal reliability and backhaul constraints"],
      interventions: ["Request BTRC approval for N additional priority 4G sites in char and river-edge gaps", "Use shared passive infrastructure and solar backup to lower operator capex", "Bundle new sites with quarterly upload-speed and outage reporting"],
      rank: 5,
      gapReq: 25
    },
    throughput_ul: {
      framework: "Connect 2030 quality target · ITU-D universal meaningful connectivity",
      text: "Upload is the clearest service-quality bottleneck: 0.44 Mbps blocks MFS verification, video calls, online work, and school content contribution even where a user can technically connect.",
      evidence: ["UL throughput 0.44 Mbps", "91% below a 5 Mbps service-quality benchmark", "PRB utilization around 43.67%, suggesting optimization headroom before major civil works"],
      interventions: ["Mandate operator upload optimization at high-complaint cells before new subsidy release", "Deploy LTE-A carrier aggregation and uplink parameter retuning on existing high-PRB towers", "Publish union-level median UL speed every quarter for Ramgati pilot monitoring"],
      rank: 1,
      gapReq: 20
    },
    throughput_dl: {
      framework: "ITU-D Resolution 70 · Quality of service and education access",
      text: "Download speed is below a meaningful-use threshold, but the field signal suggests weak radio quality rather than simple congestion, so first action should be RF optimization and targeted infill.",
      evidence: ["DL throughput 6.65 Mbps, about one-third of a 20 Mbps planning benchmark", "CQI 9.1 indicates weak signal quality", "PRB utilization around 43.67%"],
      interventions: ["Run RF drive-test and antenna tilt optimization across low-CQI clusters", "Add 2-3 targeted 4G infill sites for char coverage gaps if optimization fails", "Tie school and union digital centre service readiness to measured DL/UL thresholds"],
      rank: 3,
      gapReq: 30
    },
    signal_quality: {
      framework: "BTRC QoS monitoring · ITU-T service continuity",
      text: "Signal quality is suppressing actual use: CQI is below the quality threshold and SRVCC weakness can interrupt calls and app sessions during 4G-to-2G fallback.",
      evidence: ["CQI 9.1 vs threshold near 10", "SRVCC 81.65% vs service-continuity target above 95%", "Weak signal explains quality complaints despite moderate PRB load"],
      interventions: ["Require a Ramgati RF optimization sprint with before/after CQI reporting", "Review SRVCC and handover parameters for Robi-dominant cells", "Install small cells or repeaters only in verified deep-char blind spots"],
      rank: 6,
      gapReq: 20
    },
    gender_inclusion: {
      framework: "ITU-D Resolution 70 (Gender) · ITU-T Focus Group AI4EE · RR No. 49",
      text: "Women's digital inclusion is a policy and permission barrier, not only a network barrier. The 10/100 inclusion score should trigger targeted adoption measures alongside access investment.",
      evidence: ["Gender inclusion score 10/100", "Survey responses indicate social and permission barriers", "Female MFS agent scarcity raises trust and adoption costs on char islands"],
      interventions: ["Require quarterly gender-disaggregated internet-use reporting from operators", "Run women-only Digital Didi sessions at BRAC/NGO centres and union parishads", "Prioritize subsidized smartphone installments for female-headed households", "Create female MFS agent coverage targets for char settlements"],
      rank: 2,
      gapReq: 30
    },
    age_inclusion_senior: {
      framework: "ITU-D Resolution 70 · WSIS Action Line C7 · SDG 4",
      text: "Older residents need a separate digital literacy pathway because generic youth-oriented training does not remove interface and trust barriers for 40+ users.",
      evidence: ["Age inclusion senior score 65/100", "40+ internet use trails the youth baseline", "Navigation and service-literacy barriers remain in e-service workflows"],
      interventions: ["Run mosque, health-centre, and union-office Bangla e-service clinics for 40+ users", "Use peer digital buddy groups for NID, health, agriculture, and MFS tasks", "Promote Bangla voice-first and low-literacy interfaces through local service points"],
      rank: 7,
      gapReq: 10
    },
    wifi_adoption: {
      framework: "Connect 2030 Agenda · Community access and last-mile affordability",
      text: "Mobile-only dependency keeps usage quality tied to tower load and handset affordability. Community WiFi should be activated where fiber already exists instead of defaulting to new backbone spend.",
      evidence: ["WiFi adoption score 25/100", "75% mobile-only dependency", "Fiber density is already 90.1 with 191.6 km in the local backbone inventory"],
      interventions: ["Install community WiFi hubs at union offices, schools, and health centres using existing NTTN backhaul", "Create WISP licensing support for local entrepreneurs", "Bundle WiFi vouchers with social tariff households and student access points"],
      rank: 8,
      gapReq: 20
    },
    network_quality: {
      framework: "BTRC QoS compliance · Budget prioritization rule",
      text: "Core network indicators are relatively healthy, so extra budget should not be absorbed by generic core upgrades unless the selected target requires it.",
      evidence: ["Network quality score 93.2/100", "RRC/ERAB indicators are strong in the processed baseline", "The remaining pain point is service continuity and uplink quality"],
      interventions: ["Protect core maintenance budget but prioritize UL, gender inclusion, and last-mile adoption", "Use SLA-based monitoring before approving major core-network capex", "Flag SRVCC remediation as the network-quality exception"],
      rank: 9,
      gapReq: 5
    },
    fiber_backbone: {
      framework: "NTTN capacity reuse · Universal service last-mile activation",
      text: "Ramgati does not need a fiber-first recommendation unless the target exceeds existing backbone density; the better policy is to convert backbone into local access points.",
      evidence: ["Fiber density 90.1/100", "191.6 km local fiber inventory", "Access and WiFi adoption lag behind backbone availability"],
      interventions: ["Activate last-mile connections to WiFi hubs before funding new trunk fiber", "Map unused NTTN capacity to schools, clinics, and union digital centres", "Require open-access backhaul pricing for pilot community hotspots"],
      rank: 10,
      gapReq: 5
    }
  };

  const generatePolicies = () => {
    let actionable = [];
    Object.keys(goals).forEach(key => {
      if (goals[key] > dimensions[key]) {
        let gap_to_close = goals[key] - dimensions[key];
        let priority_score = gap_to_close * (feature_weights[key] || 1);
        let policyTemplate = policies[key];
        if (policyTemplate && gap_to_close > 0) {

          let priority = "LOW";
          let leftBorder = "border-slate-500";
          if (gap_to_close > 30) { priority = "CRITICAL"; leftBorder = "border-red-500"; }
          else if (gap_to_close > 20) { priority = "HIGH"; leftBorder = "border-amber-500"; }
          else if (gap_to_close > 10) { priority = "MEDIUM-HIGH"; leftBorder = "border-yellow-400"; }
          else if (gap_to_close > 5) { priority = "MEDIUM"; leftBorder = "border-blue-400"; }

          let text = policyTemplate.text;
          let interventions = [...(policyTemplate.interventions || [])];
          if (key === 'infrastructure') {
            let n_towers = Math.ceil((goals[key] / 100) * 50 * 2.1263);
            text = text.replace('N additional sites', `${n_towers - raw.total_4g_towers} additional sites`);
            interventions = interventions.map(item => item.replace('N additional', `${n_towers - raw.total_4g_towers} additional`));
          }

          actionable.push({
            key,
            title: formatName(key),
            priority,
            leftBorder,
            framework: policyTemplate.framework,
            evidence: policyTemplate.evidence || [],
            interventions,
            text,
            score: priority_score,
            from: dimensions[key].toFixed(1),
            to: goals[key].toFixed(1),
            delta: gap_to_close.toFixed(1)
          });
        }
      }
    });
    return actionable.sort((a, b) => b.score - a.score);
  };

  const activePolicies = generatePolicies();
  const additionalConnected = activePolicies.reduce((acc, p) => acc + (parseFloat(p.delta) * feature_weights[p.key] * 3000), 0);

  return (
    <div className={`flex-1 w-full h-full overflow-y-auto p-4 md:p-8 ${bg} ${text}`}>
      <div className={`max-w-6xl mx-auto space-y-8 pb-32 transition-all ${showPolicy ? 'xl:mr-[440px]' : ''}`}>

        {/* Header */}
        <div className={`p-6 rounded-2xl border ${cardBg} ${borderCol} shadow-sm`}>
          <div className="flex items-center gap-3 mb-2">
            <MapPin className="text-blue-500" size={28} />
            <h1 className="text-3xl font-bold text-blue-500">Ramgati Pilot</h1>
          </div>
          <p className="text-slate-400">Lakshmipur District Intervention Simulation Area · Engine score {liveLakshmipurScore.toFixed(1)}%</p>
        </div>

        {/* Section A: Map */}
        <div className={`p-1 rounded-2xl border ${cardBg} ${borderCol} h-96 relative overflow-hidden flex items-center justify-center`}>
          <Suspense fallback={<div className="animate-pulse text-blue-400">Loading Map...</div>}>
            <RamgatiMap severity={severity_score} darkMode={darkMode} />
          </Suspense>
        </div>

        {/* Section B: Current Status */}
        <div>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Activity className="text-blue-500" /> Current Status
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Object.keys(dimensions).map(key => {
              const val = dimensions[key];
              // Make Ramgati dynamic to the global engine target!
              const dynamicTarget = Math.max(targets[key] || 0, targetConnectivity);
              const dynamicGap = Math.max(0, dynamicTarget - val);

              return (
                <div key={key} className={`p-4 rounded-xl border ${cardBg} ${borderCol}`}>
                  <div className="text-xs text-slate-400 mb-1 font-semibold uppercase tracking-wider h-8">{formatName(key)}</div>
                  <div className="text-2xl font-bold mb-2">{val.toFixed(1)}</div>
                  <div className="w-full h-2 bg-slate-700/50 rounded-full relative mb-1">
                    <div className={`absolute top-0 left-0 h-full rounded-full ${getBarColor(dynamicGap)}`} style={{ width: `${Math.min(100, val)}%` }}></div>
                    <div className="absolute top-[-4px] w-1 h-4 bg-white/80" style={{ left: `${Math.min(100, dynamicTarget)}%` }} title={`Global Target: ${dynamicTarget}%`}></div>
                  </div>
                  <div className="text-[10px] text-slate-500 text-right">Target Gap: {dynamicGap.toFixed(1)}</div>
                </div>
              );
            })}
          </div>

          <div className={`mt-6 p-6 rounded-xl border ${cardBg} ${borderCol} flex flex-col items-center justify-center`}>
            <div className="text-sm font-semibold text-slate-400 mb-2">ML Severity Score</div>
            {/* SVG Gauge */}
            <div className="relative w-48 h-24 overflow-hidden">
              <svg viewBox="0 0 100 50" className="w-full h-full overflow-visible">
                <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke={darkMode ? "#334155" : "#e2e8f0"} strokeWidth="10" strokeLinecap="round" />
                <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke={severity_score < 40 ? "#ef4444" : severity_score < 70 ? "#f59e0b" : "#10b981"} strokeWidth="10" strokeLinecap="round" strokeDasharray={`${(severity_score / 100) * 125.6} 125.6`} />
              </svg>
              <div className="absolute bottom-0 left-0 w-full text-center text-2xl font-bold">
                {severity_score.toFixed(1)}
              </div>
            </div>
            <div className="text-xs text-slate-500 mt-2">Attribution based on gap × feature weight</div>
          </div>
        </div>

        {/* Section C: Policy Simulator */}
        <div>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <ShieldAlert className="text-blue-500" /> Policy Simulator
          </h2>
          <div className={`p-5 rounded-2xl border ${cardBg} ${borderCol}`}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-5">
            {Object.keys(dimensions).map(key => {
              const current = dimensions[key];
              const staticTarget = Math.max(targets[key] || 0, targetConnectivity, current);
              const sliderProgress = goals[key]; // The interactive simulation position
              const isAuto = sliderProgress > current && key !== 'internet_access';

              const dynamicGap = Math.max(0, staticTarget - sliderProgress);

              return (
                <div key={key} className={`flex flex-col gap-2 rounded-xl p-3 border ${darkMode ? 'border-slate-800 bg-slate-900/30' : 'border-slate-200 bg-slate-50'}`}>
                  <div className="flex justify-between items-end">
                    <label className="text-sm font-medium flex items-center gap-2">
                      {formatName(key)}
                      {isAuto && <span className="text-[9px] bg-teal-500/20 text-teal-400 px-1.5 py-0.5 rounded border border-teal-500/30">AUTO</span>}
                    </label>
                    <div className="text-xs font-mono">
                      <span className="text-blue-400 font-bold" title="Current Field Survey">{current.toFixed(1)}</span>
                      <ArrowRight size={12} className="inline mx-1 text-slate-500" />
                      <span className="text-emerald-500 font-bold" title="Engine Target">{staticTarget.toFixed(1)}</span>

                      {dynamicGap > 0 ? (
                        <span className="text-red-400 font-bold ml-2">-{dynamicGap.toFixed(1)} gap</span>
                      ) : (
                        <span className="text-slate-500 font-bold ml-2">Target Met</span>
                      )}
                    </div>
                  </div>
                  <div className="relative pt-1 pb-3">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="0.5"
                      value={sliderProgress}
                      onChange={(e) => handleSliderChange(key, e.target.value)}
                      className={`w-full h-2 rounded-lg appearance-none cursor-pointer z-10 relative bg-transparent`}
                      style={{ accentColor: sliderProgress > current ? '#10b981' : '#3b82f6' }}
                    />
                    <div className={`absolute top-2 left-0 h-2 w-full rounded-full ${darkMode ? 'bg-slate-700' : 'bg-slate-200'} pointer-events-none`}>
                      {/* Base Survey Data (Blue) */}
                      <div className="h-full rounded-full bg-blue-500 absolute top-0 left-0" style={{ width: `${(current / 100) * 100}%` }} />

                      {/* Required Target Gap Track (Light Green/Bg) */}
                      {staticTarget > current && (
                        <div className="h-full rounded-full bg-emerald-900/30 absolute top-0" style={{ left: `${(current / 100) * 100}%`, width: `${((staticTarget - current) / 100) * 100}%` }} />
                      )}

                      {/* Simulated Progress (Active Green) */}
                      {sliderProgress > current && (
                        <div className="h-full rounded-full bg-emerald-500 absolute top-0 shadow-[0_0_8px_rgba(16,185,129,0.5)]" style={{ left: `${(current / 100) * 100}%`, width: `${((sliderProgress - current) / 100) * 100}%` }} />
                      )}
                    </div>
                  </div>
                  {key === 'infrastructure' && sliderProgress > current && (
                    <div className="text-[10px] text-emerald-400 text-right mt-1 font-mono">
                      {raw.total_4g_towers} → {Math.ceil((sliderProgress / 100) * 50 * 2.1263)} towers
                    </div>
                  )}
                </div>
              );
            })}
            </div>
          </div>
        </div>

        {/* Section D moved to right-side policy panel */}
      </div>

      {showPolicy && (
        <div
          className={`fixed top-0 right-0 w-full sm:w-[420px] h-full z-[2000] flex flex-col shadow-2xl ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}
          style={{ background: darkMode ? 'rgba(10,15,28,0.97)' : 'rgba(250,247,240,0.97)', borderLeft: `1px solid ${darkMode ? 'rgba(59,130,246,0.2)' : 'rgba(59,130,246,0.5)'}` }}
        >
          <button
            onClick={() => setShowPolicy(false)}
            className={`fixed top-4 right-4 z-[9999] p-2.5 rounded-xl border transition-all shadow-lg ${darkMode ? 'bg-slate-800 border-slate-600 hover:bg-slate-700' : 'bg-[#ede8dc] border-[#c8bfa9] hover:bg-[#e2dcc8]'}`}
            title="Close policy panel"
          >
            <X className={`w-4 h-4 ${darkMode ? 'text-slate-200' : 'text-slate-700'}`} />
          </button>

          <div className={`p-5 border-b ${darkMode ? 'border-slate-700/50' : 'border-slate-300'}`}>
            <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>Ramgati Generated Policy</h2>
            <p className={`text-xs mt-1 leading-relaxed ${darkMode ? 'text-slate-500' : 'text-slate-600'}`}>
              Field analytics convert each slider delta into weighted policy pressure using the Ramgati survey baseline. The highest weighted gaps are prioritized first; dependent metrics update automatically when access targets rise.
            </p>
            <div className={`mt-3 rounded-xl p-3 border ${darkMode ? 'bg-slate-800/60 border-slate-700/50' : 'bg-slate-100 border-slate-300'}`}>
              {activePolicies.length > 0 && (
                <div className={`text-[11px] leading-relaxed mb-3 pb-3 border-b ${darkMode ? 'text-slate-400 border-slate-700/50' : 'text-slate-600 border-slate-300'}`}>
                  Most critical: {activePolicies.slice(0, 2).map(p => p.title).join(', ')}. The estimate below counts residents likely affected by closing the selected weighted gaps.
                </div>
              )}
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <div className="text-slate-400 mb-0.5">Actions</div>
                  <div className="font-bold text-blue-400">{activePolicies.length}</div>
                </div>
                <div>
                  <div className="text-slate-400 mb-0.5">Severity</div>
                  <div className="font-bold text-red-400">{severity_score.toFixed(1)}</div>
                </div>
                <div>
                  <div className="text-slate-400 mb-0.5">Residents</div>
                  <div className="font-bold text-emerald-400">{Math.round(additionalConnected).toLocaleString()}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {activePolicies.length === 0 ? (
              <div className={`p-6 rounded-xl border ${cardBg} ${borderCol} text-center ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                <CheckCircle className="w-8 h-8 mx-auto mb-3 text-emerald-500" />
                No policy changes required based on simulation goals.
              </div>
            ) : (
              activePolicies.map((p, i) => (
                <div key={i} className={`p-4 rounded-xl border-y border-r border-l-4 ${cardBg} ${p.leftBorder} ${darkMode ? 'border-y-[#1e2a3a] border-r-[#1e2a3a]' : 'border-y-slate-200 border-r-slate-200'} shadow-lg`}>
                  <div className="flex justify-between items-start mb-2 gap-3">
                    <h3 className="font-bold text-base">{p.title}</h3>
                    <span className={`text-[10px] px-2 py-1 rounded font-bold whitespace-nowrap ${p.priority === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                      p.priority === 'HIGH' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                        'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      }`}>{p.priority}</span>
                  </div>
                  {p.framework && (
                    <div className={`text-[10px] font-bold uppercase tracking-wider mb-2 px-2 py-1 rounded border ${darkMode ? 'bg-blue-500/10 text-blue-300 border-blue-500/20' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                      {p.framework}
                    </div>
                  )}
                  <p className={`text-sm leading-relaxed mb-3 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{p.text}</p>

                  {p.evidence?.length > 0 && (
                    <div className="mb-3">
                      <div className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>Evidence</div>
                      <ul className={`space-y-1 text-[11px] leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        {p.evidence.map((item, idx) => (
                          <li key={idx} className="flex gap-2">
                            <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-blue-400" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {p.interventions?.length > 0 && (
                    <div className="mb-3">
                      <div className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>Policy Interventions</div>
                      <ul className={`space-y-1 text-[11px] leading-relaxed ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                        {p.interventions.map((item, idx) => (
                          <li key={idx} className="flex gap-2">
                            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="text-xs font-mono text-emerald-500 bg-emerald-500/10 inline-block px-2 py-1 rounded border border-emerald-500/20">
                    Goal: {p.from} &rarr; {p.to} (+{p.delta})
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Sticky Button */}
      <div className={`fixed bottom-0 left-0 md:left-64 right-0 p-4 border-t ${darkMode ? 'bg-[#0f1117]/90 border-[#1e2a3a]' : 'bg-[#f5f0e8]/90 border-[#d4cbb8]'} backdrop-blur-md z-10 flex justify-end`}>
        <button
          onClick={() => setShowPolicy(true)}
          className="w-full md:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
        >
          Generate Policy Recommendations <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
};
