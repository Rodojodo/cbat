// ============================================
// Situational Awareness Test
// Memorise unit positions on a grid, then answer questions
// ============================================

import { percentileToStanine } from '../scoring.js';

export function getInstructions() {
    return `
        <p>This test measures your ability to absorb, retain, and recall spatial and tactical information.</p>
        <ul>
            <li>A <strong>9&times;9 grid</strong> will display several military units for a limited time.</li>
            <li>Memorise each unit's:
                <ul>
                    <li><strong>Position</strong> on the grid</li>
                    <li><strong>Type</strong> (tank, helicopter, infantry, ship)</li>
                    <li><strong>Callsign</strong> (e.g., Alpha, Bravo)</li>
                    <li><strong>Status</strong> (friendly = blue, hostile = red)</li>
                    <li><strong>Direction of movement</strong> (arrow direction)</li>
                </ul>
            </li>
            <li>After the display disappears, answer multiple-choice questions from memory.</li>
            <li>Difficulty increases with more units and shorter viewing times.</li>
            <li>You have <strong>6 minutes</strong> total.</li>
        </ul>
    `;
}

export function create(ctx) {
    let correct = 0;
    let total = 0;
    let destroyed = false;
    let round = 0;
    let responseTimes = [];

    const TOTAL_ROUNDS = 6;
    const GRID_SIZE = 9;

    const UNIT_TYPES = ['tank', 'helicopter', 'infantry', 'ship'];
    const CALLSIGNS = ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot', 'Golf', 'Hotel'];
    const DIRECTIONS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const DIR_ARROWS = { N: '↑', NE: '↗', E: '→', SE: '↘', S: '↓', SW: '↙', W: '←', NW: '↖' };
    const DIR_SYMBOLS = { tank: '▣', helicopter: '⊕', infantry: '▲', ship: '◆' };

    function generateUnits() {
        const count = Math.min(3 + round, 7);
        const units = [];
        const usedPositions = new Set();
        const usedCallsigns = new Set();

        for (let i = 0; i < count; i++) {
            let row, col;
            do {
                row = Math.floor(Math.random() * GRID_SIZE);
                col = Math.floor(Math.random() * GRID_SIZE);
            } while (usedPositions.has(`${row},${col}`));
            usedPositions.add(`${row},${col}`);

            let callsign;
            do {
                callsign = CALLSIGNS[Math.floor(Math.random() * CALLSIGNS.length)];
            } while (usedCallsigns.has(callsign));
            usedCallsigns.add(callsign);

            units.push({
                row,
                col,
                type: UNIT_TYPES[Math.floor(Math.random() * UNIT_TYPES.length)],
                callsign,
                friendly: Math.random() > 0.4,
                direction: DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)],
            });
        }
        return units;
    }

    function generateQuestions(units) {
        const questions = [];

        // Position question
        const posUnit = units[Math.floor(Math.random() * units.length)];
        const wrongPositions = [];
        while (wrongPositions.length < 3) {
            const r = Math.floor(Math.random() * GRID_SIZE);
            const c = Math.floor(Math.random() * GRID_SIZE);
            if (r !== posUnit.row || c !== posUnit.col) {
                const key = `${String.fromCharCode(65 + c)}${r + 1}`;
                if (!wrongPositions.includes(key)) wrongPositions.push(key);
            }
        }
        const correctPos = `${String.fromCharCode(65 + posUnit.col)}${posUnit.row + 1}`;
        const posOptions = [correctPos, ...wrongPositions].sort(() => Math.random() - 0.5);
        questions.push({
            text: `What was the grid position of callsign "${posUnit.callsign}"?`,
            options: posOptions,
            answer: posOptions.indexOf(correctPos),
        });

        // Type question
        const typeUnit = units[Math.floor(Math.random() * units.length)];
        const wrongTypes = UNIT_TYPES.filter(t => t !== typeUnit.type).slice(0, 3);
        const typeOptions = [typeUnit.type, ...wrongTypes].sort(() => Math.random() - 0.5);
        questions.push({
            text: `What type of unit was "${typeUnit.callsign}"?`,
            options: typeOptions.map(t => t.charAt(0).toUpperCase() + t.slice(1)),
            answer: typeOptions.indexOf(typeUnit.type),
        });

        // Friendly/hostile question
        const statusUnit = units[Math.floor(Math.random() * units.length)];
        const friendlyCount = units.filter(u => u.friendly).length;
        const hostileCount = units.length - friendlyCount;
        questions.push({
            text: `Was "${statusUnit.callsign}" friendly or hostile?`,
            options: ['Friendly (Blue)', 'Hostile (Red)'],
            answer: statusUnit.friendly ? 0 : 1,
        });

        // Direction question
        const dirUnit = units[Math.floor(Math.random() * units.length)];
        const wrongDirs = DIRECTIONS.filter(d => d !== dirUnit.direction).slice(0, 3);
        const dirOptions = [dirUnit.direction, ...wrongDirs].sort(() => Math.random() - 0.5);
        questions.push({
            text: `In which direction was "${dirUnit.callsign}" moving?`,
            options: dirOptions,
            answer: dirOptions.indexOf(dirUnit.direction),
        });

        // Count question
        const countType = UNIT_TYPES[Math.floor(Math.random() * UNIT_TYPES.length)];
        const actualCount = units.filter(u => u.type === countType).length;
        const wrongCounts = [];
        while (wrongCounts.length < 3) {
            const c = Math.floor(Math.random() * (units.length + 1));
            if (c !== actualCount && !wrongCounts.includes(c)) wrongCounts.push(c);
        }
        const countOptions = [String(actualCount), ...wrongCounts.map(String)].sort(() => Math.random() - 0.5);
        questions.push({
            text: `How many ${countType}(s) were on the grid?`,
            options: countOptions,
            answer: countOptions.indexOf(String(actualCount)),
        });

        return questions;
    }

    function drawGrid(units) {
        const cellSize = 52;
        const gridW = GRID_SIZE * cellSize;

        let html = '<div class="sa-grid-container">';
        html += `<div style="display:inline-grid;grid-template-columns:30px repeat(${GRID_SIZE}, ${cellSize}px);gap:1px;background:var(--border-color);border:1px solid var(--border-color);border-radius:var(--radius)">`;

        // Header row
        html += '<div></div>';
        for (let c = 0; c < GRID_SIZE; c++) {
            html += `<div style="text-align:center;padding:4px;background:var(--bg-secondary);color:var(--text-muted);font-size:0.75rem;font-weight:700">${String.fromCharCode(65 + c)}</div>`;
        }

        for (let r = 0; r < GRID_SIZE; r++) {
            // Row header
            html += `<div style="display:flex;align-items:center;justify-content:center;background:var(--bg-secondary);color:var(--text-muted);font-size:0.75rem;font-weight:700">${r + 1}</div>`;

            for (let c = 0; c < GRID_SIZE; c++) {
                const unit = units.find(u => u.row === r && u.col === c);
                let cellContent = '';

                if (unit) {
                    const color = unit.friendly ? '#3b82f6' : '#ef4444';
                    const symbol = DIR_SYMBOLS[unit.type];
                    const arrow = DIR_ARROWS[unit.direction];
                    cellContent = `
                        <div style="color:${color};font-size:1.1rem;font-weight:700;line-height:1">${symbol}</div>
                        <div style="color:${color};font-size:0.6rem;font-weight:600">${unit.callsign}</div>
                        <div style="color:var(--text-muted);font-size:0.8rem">${arrow}</div>
                    `;
                }

                html += `<div style="width:${cellSize}px;height:${cellSize}px;background:var(--bg-card);display:flex;flex-direction:column;align-items:center;justify-content:center">${cellContent}</div>`;
            }
        }

        html += '</div>';

        // Legend
        html += `<div class="sa-info-panel" style="display:flex;gap:20px;flex-wrap:wrap;justify-content:center;margin-top:8px;padding:8px">
            <span style="color:#3b82f6">■ Friendly</span>
            <span style="color:#ef4444">■ Hostile</span>
            <span>▣ Tank</span>
            <span>⊕ Helicopter</span>
            <span>▲ Infantry</span>
            <span>◆ Ship</span>
            <span>Arrow = direction</span>
        </div>`;

        html += '</div>';
        return html;
    }

    function showMemorisePhase() {
        if (destroyed || round >= TOTAL_ROUNDS) {
            finishTest();
            return;
        }

        const units = generateUnits();
        const viewTime = Math.max(5000, 12000 - round * 1200); // decreases each round

        ctx.container.innerHTML = `
            <p class="text-muted mb-2" style="text-align:center">
                Round ${round + 1}/${TOTAL_ROUNDS} — Memorise the grid (${(viewTime/1000).toFixed(0)}s)
            </p>
            ${drawGrid(units)}
            <div style="margin-top:8px;text-align:center">
                <div style="background:var(--raf-blue);height:4px;border-radius:2px;transition:width linear;width:100%" id="sa-progress"></div>
            </div>
        `;

        ctx.onUpdateHud({ question: `Round ${round + 1}/${TOTAL_ROUNDS} — Memorise` });

        // Animate progress bar
        const progressEl = document.getElementById('sa-progress');
        if (progressEl) {
            setTimeout(() => {
                progressEl.style.width = '0%';
                progressEl.style.transition = `width ${viewTime}ms linear`;
            }, 50);
        }

        setTimeout(() => {
            if (destroyed) return;
            showQuestionPhase(units);
        }, viewTime);
    }

    function showQuestionPhase(units) {
        if (destroyed) return;
        const questions = generateQuestions(units);
        let qIdx = 0;

        function showQuestion() {
            if (destroyed || qIdx >= questions.length) {
                round++;
                showMemorisePhase();
                return;
            }

            const q = questions[qIdx];
            const questionStart = performance.now();

            ctx.container.innerHTML = `
                <p class="text-muted mb-2" style="text-align:center">
                    Round ${round + 1} — Question ${qIdx + 1}/${questions.length}
                </p>
                <p style="font-size:1.1rem;font-weight:600;text-align:center;margin-bottom:16px">${q.text}</p>
                <div class="mc-options" style="max-width:400px" id="sa-options"></div>
            `;

            const optContainer = document.getElementById('sa-options');
            q.options.forEach((opt, i) => {
                const btn = document.createElement('button');
                btn.className = 'mc-btn';
                btn.textContent = opt;
                btn.addEventListener('click', () => {
                    if (destroyed) return;
                    total++;
                    const responseTime = (performance.now() - questionStart) / 1000;
                    responseTimes.push(responseTime);

                    const isCorrect = i === q.answer;
                    if (isCorrect) correct++;

                    btn.classList.add(isCorrect ? 'correct' : 'wrong');
                    if (!isCorrect) {
                        optContainer.children[q.answer]?.classList.add('correct');
                    }

                    ctx.onUpdateHud({ score: correct });
                    qIdx++;
                    setTimeout(() => showQuestion(), 500);
                });
                optContainer.appendChild(btn);
            });

            ctx.onUpdateHud({ question: `R${round + 1} Q${qIdx + 1}` });
        }

        showQuestion();
    }

    function finishTest() {
        if (destroyed) return;
        destroyed = true;
        ctx.stopTimer();

        const avgTime = responseTimes.length > 0
            ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
            : 0;

        const pct = total > 0 ? (correct / total) * 100 : 0;
        let percentile;
        if (pct < 20) percentile = 2;
        else if (pct < 30) percentile = 7;
        else if (pct < 40) percentile = 17;
        else if (pct < 50) percentile = 31;
        else if (pct < 62) percentile = 50;
        else if (pct < 72) percentile = 68;
        else if (pct < 82) percentile = 83;
        else if (pct < 90) percentile = 92;
        else percentile = 98;

        ctx.onComplete({
            correct,
            total,
            avgTime,
            stanine: percentileToStanine(percentile),
            details: `Completed ${round} rounds of grid memorisation. Units increased from ${3} to ${Math.min(3 + round - 1, 7)} per grid.`,
        });
    }

    return {
        start() {
            ctx.startTimer(360); // 6 min
            showMemorisePhase();
        },
        onTimeUp() { finishTest(); },
        destroy() { destroyed = true; },
    };
}
