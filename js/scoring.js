// ============================================
// RAF CBAT Scoring System
// Stanine-based scoring with aptitude areas
// ============================================

// Stanine percentile boundaries (cumulative)
// Stanine 1: bottom 4%, 2: 4-11%, 3: 11-23%, 4: 23-40%, 5: 40-60%
// 6: 60-77%, 7: 77-89%, 8: 89-96%, 9: top 4%
const STANINE_PERCENTILES = [0, 4, 11, 23, 40, 60, 77, 89, 96, 100];

// Aptitude areas and which tests contribute to each
export const APTITUDE_AREAS = {
    NumR: { name: 'Numerical Reasoning', tests: ['numerical-ops', 'airborne-numerical'] },
    SpaR: { name: 'Spatial Reasoning', tests: ['angles-bearings', 'instrument-comp', 'trace-test'] },
    Motor: { name: 'Motor / Psychomotor', tests: ['sensory-motor', 'trace-test'] },
    VisPerc: { name: 'Visual Perception', tests: ['visual-search', 'table-reading', 'instrument-comp'] },
    SymR: { name: 'Symbolic Reasoning', tests: ['verbal-logic'] },
    PrcptSTM: { name: 'Perception / Short-Term Memory', tests: ['digit-recognition', 'situational-awareness'] },
    STMCIP: { name: 'Strategic Task Management', tests: ['flag'] },
};

// Role weightings for aptitude areas (approximate, based on public info)
export const ROLE_WEIGHTINGS = {
    Pilot: { NumR: 20, SpaR: 25, Motor: 20, VisPerc: 15, SymR: 5, PrcptSTM: 10, STMCIP: 5, cutoff: 112 },
    'RPAS Pilot': { NumR: 20, SpaR: 20, Motor: 15, VisPerc: 15, SymR: 10, PrcptSTM: 10, STMCIP: 10, cutoff: 112 },
    WSO: { NumR: 15, SpaR: 20, Motor: 10, VisPerc: 15, SymR: 15, PrcptSTM: 15, STMCIP: 10, cutoff: 100 },
    'WSOp': { NumR: 10, SpaR: 11, Motor: 5, VisPerc: 10, SymR: 36, PrcptSTM: 44, STMCIP: 9, cutoff: 90 },
    'ATC Officer': { NumR: 15, SpaR: 20, Motor: 5, VisPerc: 20, SymR: 15, PrcptSTM: 15, STMCIP: 10, cutoff: 100 },
};

// Each test defines its own scoring thresholds.
// These are percentile thresholds (0-100 scale) that map raw performance to a stanine.
// Tests export a function that converts raw results to a 0-100 percentile-like score.
// We then map that to a stanine.

export function percentileToStanine(percentile) {
    for (let i = 1; i <= 9; i++) {
        if (percentile < STANINE_PERCENTILES[i]) {
            return i;
        }
    }
    return 9;
}

export function stanineToLabel(stanine) {
    const labels = ['', 'Very Low', 'Low', 'Below Average', 'Low Average', 'Average', 'High Average', 'Above Average', 'High', 'Very High'];
    return labels[stanine] || '';
}

export function stanineToPercentileRange(stanine) {
    return `${STANINE_PERCENTILES[stanine - 1]}-${STANINE_PERCENTILES[stanine]}%`;
}

// Calculate aptitude area stanines from individual test stanines
export function calculateAptitudeAreas(testStanines) {
    const areas = {};
    for (const [areaKey, area] of Object.entries(APTITUDE_AREAS)) {
        const relevantTests = area.tests.filter(t => testStanines[t] !== undefined);
        if (relevantTests.length === 0) {
            areas[areaKey] = null;
            continue;
        }
        const avg = relevantTests.reduce((sum, t) => sum + testStanines[t], 0) / relevantTests.length;
        areas[areaKey] = Math.round(avg);
    }
    return areas;
}

// Calculate role scores from aptitude areas
export function calculateRoleScores(aptitudeStanines) {
    const roleScores = {};
    for (const [role, weights] of Object.entries(ROLE_WEIGHTINGS)) {
        let totalWeightedScore = 0;
        let totalWeight = 0;
        let hasAllAreas = true;

        for (const [area, weight] of Object.entries(weights)) {
            if (area === 'cutoff') continue;
            if (aptitudeStanines[area] === null || aptitudeStanines[area] === undefined) {
                hasAllAreas = false;
                continue;
            }
            totalWeightedScore += aptitudeStanines[area] * weight;
            totalWeight += weight;
        }

        if (totalWeight > 0) {
            const score = Math.round(totalWeightedScore / 5);
            roleScores[role] = {
                score,
                cutoff: weights.cutoff,
                pass: score >= weights.cutoff,
                complete: hasAllAreas,
            };
        }
    }
    return roleScores;
}

// Generate stanine HTML bar
export function renderStanineBar(stanine) {
    let html = '<div class="stanine-bar">';
    for (let i = 1; i <= 9; i++) {
        const active = i === stanine ? 'active' : '';
        html += `<div class="stanine-segment s${i} ${active}">${i}</div>`;
    }
    html += '</div>';
    return html;
}

// Store and retrieve scores from localStorage
const STORAGE_KEY = 'cbat_scores';

export function saveTestScore(testId, result) {
    const data = getStoredScores();
    if (!data[testId]) data[testId] = [];
    data[testId].push({
        ...result,
        date: new Date().toISOString(),
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function getStoredScores() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch {
        return {};
    }
}

export function getBestStanine(testId) {
    const data = getStoredScores();
    if (!data[testId] || data[testId].length === 0) return null;
    return Math.max(...data[testId].map(r => r.stanine));
}

export function clearScores() {
    localStorage.removeItem(STORAGE_KEY);
}
