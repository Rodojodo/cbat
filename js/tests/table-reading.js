// ============================================
// Table Reading Test (MATF)
// Cross-reference values in a grid rapidly
// ============================================

import { percentileToStanine } from '../scoring.js';

export function getInstructions() {
    return `
        <p>This test measures your speed and accuracy in reading and cross-referencing tables.</p>
        <ul>
            <li>A grid is displayed with row values (-17 to +17) on the left and column values (-17 to +17) across the top.</li>
            <li>Two values (X and Y) appear below the grid.</li>
            <li>Find the <strong>X value</strong> along the top (columns) and the <strong>Y value</strong> along the left (rows).</li>
            <li>The number at their intersection is your answer.</li>
            <li>Type the answer and press Enter. Work as fast as possible.</li>
            <li>In the real test, a physical sheet is provided. Here the table is on-screen.</li>
            <li>You have <strong>4 minutes</strong>.</li>
        </ul>
    `;
}

export function create(ctx) {
    let correct = 0;
    let total = 0;
    let destroyed = false;
    let responseTimes = [];
    let tableData = {};
    let currentAnswer = null;

    const RANGE = 17; // -17 to +17

    function generateTable() {
        tableData = {};
        for (let y = -RANGE; y <= RANGE; y++) {
            tableData[y] = {};
            for (let x = -RANGE; x <= RANGE; x++) {
                // Generate realistic-looking values (could be anything, but let's make it navigational)
                tableData[y][x] = Math.floor(Math.random() * 900) + 100; // 3-digit numbers
            }
        }
    }

    function renderTable() {
        const cols = [];
        for (let x = -RANGE; x <= RANGE; x++) cols.push(x);

        let html = '<table class="tr-table">';
        // Header
        html += '<tr><th class="row-header">Y\\X</th>';
        cols.forEach(x => {
            html += `<th>${x}</th>`;
        });
        html += '</tr>';

        // Rows
        for (let y = -RANGE; y <= RANGE; y++) {
            html += `<tr><td class="row-header">${y}</td>`;
            cols.forEach(x => {
                html += `<td>${tableData[y][x]}</td>`;
            });
            html += '</tr>';
        }
        html += '</table>';
        return html;
    }

    function showRound() {
        if (destroyed) return;

        // Pick random X and Y
        const x = Math.floor(Math.random() * (RANGE * 2 + 1)) - RANGE;
        const y = Math.floor(Math.random() * (RANGE * 2 + 1)) - RANGE;
        currentAnswer = tableData[y][x];

        const questionStart = performance.now();

        // Only re-render lookup values, keep table
        const lookupEl = document.getElementById('tr-lookup');
        const inputEl = document.getElementById('tr-input');

        if (lookupEl && inputEl) {
            lookupEl.innerHTML = `Find: X = <span>${x}</span>, Y = <span>${y}</span>`;
            inputEl.value = '';
            inputEl.focus();
        } else {
            // First render - full page
            ctx.container.innerHTML = `
                <div class="tr-lookup" id="tr-lookup">
                    Find: X = <span>${x}</span>, Y = <span>${y}</span>
                </div>
                <div class="tr-table-container">
                    ${renderTable()}
                </div>
                <div class="ant-input-row" style="justify-content:center;margin-top:8px">
                    <input type="text" class="num-ops-input" id="tr-input" inputmode="numeric"
                           placeholder="Answer" autocomplete="off" autofocus style="width:120px;font-size:1.3rem">
                </div>
                <p class="text-muted mt-2" style="font-size:0.8rem;text-align:center">
                    Type the value at the intersection and press Enter
                </p>
            `;

            const input = document.getElementById('tr-input');
            input.addEventListener('keydown', function handler(e) {
                if (e.key === 'Enter') {
                    submitAnswer(input, questionStart);
                }
            });
            input.focus();
        }

        ctx.onUpdateHud({ question: `Answered: ${total}`, score: correct });
    }

    function submitAnswer(inputEl, questionStart) {
        if (destroyed || !inputEl) return;
        const val = parseInt(inputEl.value, 10);
        if (isNaN(val)) return;

        total++;
        const responseTime = (performance.now() - questionStart) / 1000;
        responseTimes.push(responseTime);

        if (val === currentAnswer) {
            correct++;
            inputEl.style.borderColor = 'var(--accent-green)';
        } else {
            inputEl.style.borderColor = 'var(--danger)';
        }

        ctx.onUpdateHud({ score: correct, question: `Answered: ${total}` });

        setTimeout(() => {
            if (inputEl) inputEl.style.borderColor = 'var(--border-color)';
            showRound();
        }, 200);
    }

    function finishTest() {
        if (destroyed) return;
        destroyed = true;
        ctx.stopTimer();

        const avgTime = responseTimes.length > 0
            ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
            : 0;

        // Work rate scoring
        let percentile;
        if (correct <= 5) percentile = 2;
        else if (correct <= 10) percentile = 7;
        else if (correct <= 15) percentile = 17;
        else if (correct <= 22) percentile = 31;
        else if (correct <= 30) percentile = 50;
        else if (correct <= 38) percentile = 68;
        else if (correct <= 48) percentile = 83;
        else if (correct <= 58) percentile = 92;
        else percentile = 98;

        ctx.onComplete({
            correct,
            total,
            avgTime,
            stanine: percentileToStanine(percentile),
            details: `Cross-referenced ${total} values in 4 minutes. Average lookup time: ${avgTime.toFixed(1)}s.`,
        });
    }

    return {
        start() {
            generateTable();
            ctx.startTimer(240); // 4 min
            showRound();
        },
        onTimeUp() { finishTest(); },
        destroy() { destroyed = true; },
    };
}
