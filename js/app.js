// ============================================
// RAF CBAT Practice - Main Application
// ============================================

import * as scoring from './scoring.js';

// Test registry
const TEST_MODULES = {};
const TEST_META = [
    {
        id: 'numerical-ops',
        name: 'Numerical Operations',
        tag: 'NumR',
        tagClass: 'tag-numr',
        desc: 'Rapid-fire mental arithmetic. Answer as many as possible within the time limit.',
        duration: '4 min',
        module: () => import('./tests/numerical-ops.js'),
    },
    {
        id: 'digit-recognition',
        name: 'Digit Recognition',
        tag: 'Prcpt-STM',
        tagClass: 'tag-prcptstm',
        desc: 'Memorise strings of digits then answer questions about what you saw.',
        duration: '4 min',
        module: () => import('./tests/digit-recognition.js'),
    },
    {
        id: 'angles-bearings',
        name: 'Angles, Bearings & Degrees',
        tag: 'SpaR',
        tagClass: 'tag-spar',
        desc: 'Estimate angles and compass bearings from visual displays.',
        duration: '5 min',
        module: () => import('./tests/angles-bearings.js'),
    },
    {
        id: 'instrument-comp',
        name: 'Instrument Comprehension',
        tag: 'SpaR',
        tagClass: 'tag-spar',
        desc: 'Read flight instruments and match them to aircraft orientation.',
        duration: '5 min',
        module: () => import('./tests/instrument-comp.js'),
    },
    {
        id: 'airborne-numerical',
        name: 'Airborne Numerical Test',
        tag: 'NumR',
        tagClass: 'tag-numr',
        desc: 'Speed, distance, time and fuel calculations from mission scenarios.',
        duration: '8 min',
        module: () => import('./tests/airborne-numerical.js'),
    },
    {
        id: 'visual-search',
        name: 'Visual Search',
        tag: 'Vis-Perc',
        tagClass: 'tag-visperc',
        desc: 'Scan a grid of tiles to find matching symbols and identify numbers.',
        duration: '4 min',
        module: () => import('./tests/visual-search.js'),
    },
    {
        id: 'flag',
        name: 'FLAG (Multitasking)',
        tag: 'STM-CIP',
        tagClass: 'tag-stmcip',
        desc: 'Simultaneous mental maths and aircraft zone tracking.',
        duration: '5 min',
        module: () => import('./tests/flag.js'),
    },
    {
        id: 'sensory-motor',
        name: 'Sensory Motor Apparatus',
        tag: 'Motor',
        tagClass: 'tag-motor',
        desc: 'Track a drifting dot and keep it centred using your mouse.',
        duration: '3 min',
        module: () => import('./tests/sensory-motor.js'),
    },
    {
        id: 'verbal-logic',
        name: 'Verbal Logic',
        tag: 'SymR',
        tagClass: 'tag-symr',
        desc: 'Interpret information across multiple tabs to answer logic questions.',
        duration: '8 min',
        module: () => import('./tests/verbal-logic.js'),
    },
    {
        id: 'situational-awareness',
        name: 'Situational Awareness',
        tag: 'Prcpt-STM',
        tagClass: 'tag-prcptstm',
        desc: 'Memorise unit positions, types and movements on a grid, then answer questions.',
        duration: '6 min',
        module: () => import('./tests/situational-awareness.js'),
    },
    {
        id: 'table-reading',
        name: 'Table Reading',
        tag: 'Vis-Perc',
        tagClass: 'tag-visperc',
        desc: 'Cross-reference values in a grid as quickly as possible.',
        duration: '4 min',
        module: () => import('./tests/table-reading.js'),
    },
    {
        id: 'trace-test',
        name: 'Trace Test',
        tag: 'SpaR',
        tagClass: 'tag-spar',
        desc: 'Mirror aircraft control inputs using arrow keys, adjusting for orientation.',
        duration: '4 min',
        module: () => import('./tests/trace-test.js'),
    },
];

// DOM refs
const screens = {
    menu: document.getElementById('screen-menu'),
    instructions: document.getElementById('screen-instructions'),
    test: document.getElementById('screen-test'),
    results: document.getElementById('screen-results'),
    batteryResults: document.getElementById('screen-battery-results'),
};
const els = {
    testGrid: document.getElementById('test-grid'),
    instrTitle: document.getElementById('instr-title'),
    instrBody: document.getElementById('instr-body'),
    btnStartTest: document.getElementById('btn-start-test'),
    btnBackMenu: document.getElementById('btn-back-menu'),
    hudTestName: document.getElementById('hud-test-name'),
    hudTimer: document.getElementById('hud-timer'),
    hudQuestion: document.getElementById('hud-question'),
    hudScore: document.getElementById('hud-score'),
    testArea: document.getElementById('test-area'),
    resultsBody: document.getElementById('results-body'),
    btnResultsMenu: document.getElementById('btn-results-menu'),
    btnResultsRetry: document.getElementById('btn-results-retry'),
    btnStartAll: document.getElementById('btn-start-all'),
    btnViewScores: document.getElementById('btn-view-scores'),
    batteryResultsBody: document.getElementById('battery-results-body'),
    btnBatteryMenu: document.getElementById('btn-battery-menu'),
};

// State
let currentTestId = null;
let currentTestInstance = null;
let timerInterval = null;
let batteryMode = false;
let batteryQueue = [];
let batteryResults = {};

// ---- Screen Management ----
function showScreen(name) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[name].classList.add('active');
}

// ---- Build Test Grid ----
function buildTestGrid() {
    els.testGrid.innerHTML = '';
    TEST_META.forEach(test => {
        const best = scoring.getBestStanine(test.id);
        const card = document.createElement('div');
        card.className = 'test-card';
        card.innerHTML = `
            <div class="card-header">
                <h3>${test.name}</h3>
                <span class="card-tag ${test.tagClass}">${test.tag}</span>
            </div>
            <p class="card-desc">${test.desc}</p>
            <div class="card-meta">
                Duration: ~${test.duration}
                ${best ? `<span class="card-best"> | Best: Stanine ${best}</span>` : ''}
            </div>
        `;
        card.addEventListener('click', () => startSingleTest(test.id));
        els.testGrid.appendChild(card);
    });
}

// ---- Timer ----
function startTimer(seconds, onTick, onComplete) {
    let remaining = seconds;
    updateTimerDisplay(remaining);
    if (onTick) onTick(remaining);

    timerInterval = setInterval(() => {
        remaining--;
        updateTimerDisplay(remaining);
        if (onTick) onTick(remaining);

        if (remaining <= 0) {
            clearInterval(timerInterval);
            timerInterval = null;
            if (onComplete) onComplete();
        }
    }, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function updateTimerDisplay(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    els.hudTimer.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    els.hudTimer.className = 'hud-item hud-timer';
    if (seconds <= 10) els.hudTimer.classList.add('danger');
    else if (seconds <= 30) els.hudTimer.classList.add('warning');
}

// ---- Countdown ----
function showCountdown() {
    return new Promise(resolve => {
        const overlay = document.createElement('div');
        overlay.className = 'countdown-overlay';
        document.body.appendChild(overlay);
        let count = 3;
        overlay.textContent = count;
        const interval = setInterval(() => {
            count--;
            if (count <= 0) {
                clearInterval(interval);
                overlay.remove();
                resolve();
            } else {
                overlay.textContent = count;
            }
        }, 800);
    });
}

// ---- Test Lifecycle ----
async function startSingleTest(testId) {
    currentTestId = testId;
    const meta = TEST_META.find(t => t.id === testId);
    if (!meta) return;

    // Load module
    if (!TEST_MODULES[testId]) {
        const mod = await meta.module();
        TEST_MODULES[testId] = mod;
    }

    const testModule = TEST_MODULES[testId];

    // Show instructions
    els.instrTitle.textContent = meta.name;
    els.instrBody.innerHTML = testModule.getInstructions();
    showScreen('instructions');

    // Wire up start button
    els.btnStartTest.onclick = async () => {
        showScreen('test');
        els.hudTestName.textContent = meta.name;
        els.hudQuestion.textContent = '';
        els.hudScore.textContent = '';
        els.testArea.innerHTML = '';

        await showCountdown();

        currentTestInstance = testModule.create({
            container: els.testArea,
            onUpdateHud: (data) => {
                if (data.question) els.hudQuestion.textContent = data.question;
                if (data.score !== undefined) els.hudScore.textContent = `Score: ${data.score}`;
            },
            onComplete: (result) => {
                stopTimer();
                showTestResults(testId, result);
            },
            startTimer: (seconds, onTick) => {
                startTimer(seconds, onTick, () => {
                    if (currentTestInstance && currentTestInstance.onTimeUp) {
                        currentTestInstance.onTimeUp();
                    }
                });
            },
            stopTimer,
        });

        currentTestInstance.start();
    };

    els.btnBackMenu.onclick = () => {
        showScreen('menu');
    };
}

function showTestResults(testId, result) {
    const meta = TEST_META.find(t => t.id === testId);
    const stanine = result.stanine;

    // Save score
    scoring.saveTestScore(testId, result);

    // Build results display
    let html = `
        <div class="result-row">
            <span class="result-label">Test</span>
            <span class="result-value">${meta.name}</span>
        </div>
        <div class="result-row">
            <span class="result-label">Correct</span>
            <span class="result-value">${result.correct} / ${result.total}</span>
        </div>
        <div class="result-row">
            <span class="result-label">Accuracy</span>
            <span class="result-value">${result.total > 0 ? Math.round(result.correct / result.total * 100) : 0}%</span>
        </div>
    `;

    if (result.avgTime !== undefined) {
        html += `
            <div class="result-row">
                <span class="result-label">Avg Response Time</span>
                <span class="result-value">${result.avgTime.toFixed(1)}s</span>
            </div>
        `;
    }

    html += `
        <div class="result-row">
            <span class="result-label">Stanine</span>
            <span class="result-value">${stanine} (${scoring.stanineToLabel(stanine)})</span>
        </div>
        ${scoring.renderStanineBar(stanine)}
        <p class="text-muted mt-2" style="font-size:0.8rem">
            Stanine ${stanine} = ${scoring.stanineToPercentileRange(stanine)} percentile
        </p>
    `;

    if (result.details) {
        html += `<div class="mt-4" style="font-size:0.85rem;color:var(--text-secondary)">${result.details}</div>`;
    }

    els.resultsBody.innerHTML = html;
    showScreen('results');

    // Store for battery mode
    if (batteryMode) {
        batteryResults[testId] = result;
    }

    els.btnResultsMenu.onclick = () => {
        cleanupTest();
        if (batteryMode && batteryQueue.length > 0) {
            const nextId = batteryQueue.shift();
            startSingleTest(nextId);
        } else if (batteryMode) {
            showBatteryResults();
        } else {
            buildTestGrid();
            showScreen('menu');
        }
    };

    // Change button text in battery mode
    if (batteryMode && batteryQueue.length > 0) {
        els.btnResultsMenu.textContent = 'Next Test';
    } else if (batteryMode) {
        els.btnResultsMenu.textContent = 'View Battery Results';
    } else {
        els.btnResultsMenu.textContent = 'Back to Menu';
    }

    els.btnResultsRetry.onclick = () => {
        cleanupTest();
        startSingleTest(testId);
    };
    els.btnResultsRetry.style.display = batteryMode ? 'none' : '';
}

function showBatteryResults() {
    batteryMode = false;
    const testStanines = {};
    for (const [id, result] of Object.entries(batteryResults)) {
        testStanines[id] = result.stanine;
    }

    const aptitudes = scoring.calculateAptitudeAreas(testStanines);
    const roleScores = scoring.calculateRoleScores(aptitudes);

    let html = '<h3 style="margin-bottom:12px">Individual Test Scores</h3>';
    html += '<table class="aptitude-table">';
    html += '<tr><th>Test</th><th>Correct</th><th>Stanine</th></tr>';
    for (const meta of TEST_META) {
        const r = batteryResults[meta.id];
        if (!r) continue;
        html += `<tr>
            <td>${meta.name}</td>
            <td>${r.correct}/${r.total}</td>
            <td class="stanine-cell">${r.stanine}</td>
        </tr>`;
    }
    html += '</table>';

    html += '<h3 style="margin:20px 0 12px">Aptitude Areas</h3>';
    html += '<table class="aptitude-table">';
    html += '<tr><th>Area</th><th>Stanine</th><th>Rating</th></tr>';
    for (const [key, area] of Object.entries(scoring.APTITUDE_AREAS)) {
        const s = aptitudes[key];
        html += `<tr>
            <td>${area.name}</td>
            <td class="stanine-cell">${s !== null ? s : '—'}</td>
            <td>${s !== null ? scoring.stanineToLabel(s) : '—'}</td>
        </tr>`;
    }
    html += '</table>';

    html += '<h3 style="margin:20px 0 12px">Role Suitability (Estimated)</h3>';
    html += '<table class="aptitude-table">';
    html += '<tr><th>Role</th><th>Score</th><th>Cut-off</th><th>Result</th></tr>';
    for (const [role, data] of Object.entries(roleScores)) {
        const statusColor = data.pass ? 'var(--accent-green)' : 'var(--danger)';
        const statusText = data.pass ? 'PASS' : 'BELOW';
        const incomplete = data.complete ? '' : ' *';
        html += `<tr>
            <td>${role}${incomplete}</td>
            <td class="stanine-cell">${data.score}</td>
            <td class="stanine-cell">${data.cutoff}</td>
            <td style="color:${statusColor};font-weight:700;text-align:center">${statusText}</td>
        </tr>`;
    }
    html += '</table>';
    html += '<p class="text-muted mt-2" style="font-size:0.75rem">* Incomplete — not all contributing tests were taken. Scores are estimates only.</p>';

    els.batteryResultsBody.innerHTML = html;
    showScreen('batteryResults');
}

function cleanupTest() {
    stopTimer();
    if (currentTestInstance && currentTestInstance.destroy) {
        currentTestInstance.destroy();
    }
    currentTestInstance = null;
    els.testArea.innerHTML = '';
}

// ---- View Previous Scores ----
function showPreviousScores() {
    const data = scoring.getStoredScores();
    const testStanines = {};

    let html = '<h3 style="margin-bottom:12px">Best Scores by Test</h3>';
    html += '<table class="aptitude-table">';
    html += '<tr><th>Test</th><th>Best Stanine</th><th>Attempts</th></tr>';

    for (const meta of TEST_META) {
        const results = data[meta.id] || [];
        const best = results.length > 0 ? Math.max(...results.map(r => r.stanine)) : null;
        if (best !== null) testStanines[meta.id] = best;
        html += `<tr>
            <td>${meta.name}</td>
            <td class="stanine-cell">${best !== null ? best : '—'}</td>
            <td class="stanine-cell">${results.length}</td>
        </tr>`;
    }
    html += '</table>';

    // Calculate aptitude areas from best scores
    const aptitudes = scoring.calculateAptitudeAreas(testStanines);
    const roleScores = scoring.calculateRoleScores(aptitudes);

    html += '<h3 style="margin:20px 0 12px">Aptitude Areas (from best scores)</h3>';
    html += '<table class="aptitude-table">';
    html += '<tr><th>Area</th><th>Stanine</th><th>Rating</th></tr>';
    for (const [key, area] of Object.entries(scoring.APTITUDE_AREAS)) {
        const s = aptitudes[key];
        html += `<tr>
            <td>${area.name}</td>
            <td class="stanine-cell">${s !== null ? s : '—'}</td>
            <td>${s !== null ? scoring.stanineToLabel(s) : '—'}</td>
        </tr>`;
    }
    html += '</table>';

    if (Object.keys(roleScores).length > 0) {
        html += '<h3 style="margin:20px 0 12px">Role Suitability (Estimated)</h3>';
        html += '<table class="aptitude-table">';
        html += '<tr><th>Role</th><th>Score</th><th>Cut-off</th><th>Result</th></tr>';
        for (const [role, d] of Object.entries(roleScores)) {
            const color = d.pass ? 'var(--accent-green)' : 'var(--danger)';
            html += `<tr>
                <td>${role}${d.complete ? '' : ' *'}</td>
                <td class="stanine-cell">${d.score}</td>
                <td class="stanine-cell">${d.cutoff}</td>
                <td style="color:${color};font-weight:700;text-align:center">${d.pass ? 'PASS' : 'BELOW'}</td>
            </tr>`;
        }
        html += '</table>';
    }

    html += `<div style="margin-top:16px;text-align:center">
        <button class="btn btn-danger btn-sm" id="btn-clear-scores">Clear All Scores</button>
    </div>`;

    els.batteryResultsBody.innerHTML = html;
    showScreen('batteryResults');

    document.getElementById('btn-clear-scores')?.addEventListener('click', () => {
        if (confirm('Clear all saved scores?')) {
            scoring.clearScores();
            buildTestGrid();
            showScreen('menu');
        }
    });
}

// ---- Full Battery ----
function startFullBattery() {
    batteryMode = true;
    batteryQueue = TEST_META.map(t => t.id);
    batteryResults = {};
    const firstId = batteryQueue.shift();
    startSingleTest(firstId);
}

// ---- Init ----
function init() {
    buildTestGrid();

    els.btnStartAll.addEventListener('click', startFullBattery);
    els.btnViewScores.addEventListener('click', showPreviousScores);
    els.btnBatteryMenu.addEventListener('click', () => {
        buildTestGrid();
        showScreen('menu');
    });
}

init();
