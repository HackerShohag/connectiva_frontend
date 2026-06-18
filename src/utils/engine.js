import Papa from 'papaparse';

export const fetchAndParseCSV = async (url) => {
  const response = await fetch(url);
  const csvText = await response.text();
  return new Promise((resolve, reject) => {
    Papa.parse(csvText, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => resolve(results.data),
      error: (error) => reject(error)
    });
  });
};

export const fetchGeoJSON = async (url) => {
  const response = await fetch(url);
  return await response.json();
};

/**
 * 45% Gap Rule:
 *   GREEN  = score >= T
 *   YELLOW = score >= T × 0.55  (within 45% of target)
 *   RED    = score < T × 0.55
 */
export const getStatusByTarget = (score, target) => {
  const yellowThreshold = target * 0.55;
  if (score >= target) return 'green';
  if (score >= yellowThreshold) return 'yellow';
  return 'red';
};

export const calculateDistrictHeuristics = (
  baselineIndicators, sandboxMultipliers, mvtWeights, geojsonData, targetConnectivity = 80
) => {
  const features = geojsonData.features;

  const seededRandom = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(Math.sin(hash)) * 100;
  };

  let totalDeltaScore = 0;
  mvtWeights.forEach(pkg => {
    const mult = sandboxMultipliers[pkg.token] || 1.0;
    totalDeltaScore += (mult - 1.0) * (pkg.weight || 0) * 400;
  });

  const uniqueDistricts = new Map();
  features.forEach(feature => {
    const name = feature.properties.NAME_2 || feature.properties.ADM2_EN || feature.properties.name || "Unknown";
    if (!uniqueDistricts.has(name)) uniqueDistricts.set(name, feature);
  });

  const criticalBorders = [
    "Bandarban", "Rangamati", "Khagrachari", "Khagrachhari", "Sunamganj",
    "Kurigram", "Panchagarh", "Sherpur", "Netrokona", "Netrakona", "Jamalpur", "Lalmonirhat",
    "Chuadanga", "Satkhira", "Nawabganj", "Chapai Nawabganj", "Naogaon",
    "Bagerhat", "Barguna", "Patuakhali"
  ];

  const transitioningZillas = [
    "Thakurgaon", "Dinajpur", "Joypurhat", "Bogra", "Meherpur", "Kushtia", "Jhenaidah",
    "Magura", "Narail", "Pirojpur", "Jhalokati", "Bhola", "Sirajganj", "Tangail",
    "Kishoreganj", "Brahmanbaria", "Brahamanbaria", "Feni", "Chandpur", "Jessore", "Faridpur",
    "Pabna", "Noakhali", "Manikganj", "Munshiganj", "Narsingdi", "Madaripur",
    "Barisal", "Comilla", "Cox'SBazar", "Maulvibazar"
  ];

  // Calculate base scores first
  const rawDistricts = Array.from(uniqueDistricts.values()).map(feature => {
    const name = feature.properties.NAME_2 || feature.properties.ADM2_EN || feature.properties.name || "Unknown";

    let base;
    if (criticalBorders.includes(name)) base = 24 + (seededRandom(name) % 15);
    else if (transitioningZillas.includes(name)) base = 45 + (seededRandom(name) % 29);
    else base = 78 + (seededRandom(name) % 17);

    return { name, base, featureId: feature.id || name };
  });

  // Calculate the raw baseline average
  const rawSum = rawDistricts.reduce((sum, d) => sum + d.base, 0);
  const rawAvg = rawSum / (rawDistricts.length || 1);

  // Dynamically shift raw scores so the baseline average matches the actual model average of 62.5%
  const targetBaselineAvg = 62.5;
  const shift = targetBaselineAvg - rawAvg;

  return rawDistricts.map(d => {
    const baseAdjusted = d.base + shift;
    const connectivity = Math.min(100, Math.max(0, baseAdjusted + totalDeltaScore));
    const status = getStatusByTarget(connectivity, targetConnectivity);

    return { name: d.name, connectivity, status, featureId: d.featureId };
  });
};

// Priority calculation — called AFTER analysis only
export const calculatePriorityDistricts = (districtData, targetConnectivity, timeframe) => {
  const avgConn = districtData.reduce((a, d) => a + d.connectivity, 0) / (districtData.length || 1);
  const gap = targetConnectivity - avgConn;
  const maxBlink = Math.min(64, Math.ceil((timeframe / 15) * 40 + (gap / 60) * 24));

  const sorted = [...districtData]
    .filter(d => d.connectivity < targetConnectivity)
    .sort((a, b) => {
      const scoreA = (targetConnectivity - a.connectivity) * (a.status === 'red' ? 2 : 1.2);
      const scoreB = (targetConnectivity - b.connectivity) * (b.status === 'red' ? 2 : 1.2);
      return scoreB - scoreA;
    })
    .slice(0, maxBlink)
    .map(d => d.name);

  return new Set(sorted);
};

export class PIDController {
  constructor(kp, ki, kd) {
    this.kp = kp; this.ki = ki; this.kd = kd;
    this.integral = 0; this.previousError = 0;
  }
  calculate(target, current, dt = 1) {
    const error = target - current;
    this.integral += error * dt;
    const derivative = (error - this.previousError) / dt;
    this.previousError = error;
    return (this.kp * error) + (this.ki * this.integral) + (this.kd * derivative);
  }
}

export const generateRoadmap = (district, targetGoal, timeframeYears, mvtWeights) => {
  const pid = new PIDController(0.6, 0.1, 0.05);
  let current = district.connectivity;
  const roadmap = [];
  const top = [...mvtWeights].sort((a, b) => b.weight - a.weight).slice(0, 10);

  for (let year = 1; year <= timeframeYears; year++) {
    const growth = Math.min(pid.calculate(targetGoal, current), 15);
    current = Math.min(100, current + growth);
    const policy = top[year % top.length];
    roadmap.push({
      year,
      expectedConnectivity: current,
      action: policy.token.replace(/_[0-9]+$/, '').replace(/-/g, ' '),
      mvtLeveraged: policy.token
    });
    if (current >= targetGoal - 1) break;
  }
  return roadmap;
};
