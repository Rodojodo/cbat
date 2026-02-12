// ============================================
// Visual Search Test
// Find matching tiles in a grid
// ============================================

import { percentileToStanine } from '../scoring.js';

export function getInstructions() {
    return `
        <p>This test measures your ability to scan information under time constraints.</p>
        <ul>
            <li>A grid of tiles is displayed, each containing a red letter or symbol and a small black number in its corner.</li>
            <li>A <strong>reference tile</strong> appears below the grid showing a letter/symbol — but its number is hidden.</li>
            <li>Find the matching tile in the grid and type its number.</li>
            <li>Work as quickly and accurately as possible.</li>
            <li>You have <strong>4 minutes</strong>.</li>
        </ul>
    `;
}

export function create(ctx) {
    let correct = 0;
    let total = 0;
    let destroyed = false;
    let responseTimes = [];
    let gridData = [];

    const SYMBOLS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'.split('');
    const GRID_SIZE = 8;

    function generateGrid() {
        gridData = [];
        const used = new Set();
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                let sym;
                do {
                    sym = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
                    // Allow duplicates in letter but pair with different number
                } while (false);

                let num;
                do {
                    num = Math.floor(Math.random() * 90) + 10; // 10-99
                } while (used.has(num));
                used.add(num);

                gridData.push({ sym, num, row: r, col: c });
            }
        }
    }

    function pickTarget() {
        return gridData[Math.floor(Math.random() * gridData.length)];
    }

    function showRound() {
        if (destroyed) return;

        generateGrid();
        const target = pickTarget();
        const questionStart = performance.now();

        let gridHTML = `<div class="vs-grid" style="grid-template-columns:repeat(${GRID_SIZE}, 48px)">`;
        gridData.forEach(cell => {
            gridHTML += `<div class="vs-cell" style="width:48px;height:48px" data-num="${cell.num}">
                <span class="vs-content">${cell.sym}</span>
                <span class="vs-number">${cell.num}</span>
            </div>`;
        });
        gridHTML += '</div>';

        ctx.container.innerHTML = `
            <p class="text-muted mb-2">Find the matching tile and type its number</p>
            ${gridHTML}
            <div class="vs-reference">
                Target: <span style="color:var(--raf-red);font-weight:700">${target.sym}</span>
                &nbsp;|&nbsp; Number: <span>??</span>
            </div>
            <div class="ant-input-row" style="justify-content:center">
                <input type="text" class="num-ops-input" id="vs-input" inputmode="numeric"
                       placeholder="Enter number" autocomplete="off" autofocus style="width:120px;font-size:1.5rem">
            </div>
        `;

        const input = document.getElementById('vs-input');
        input.focus();

        // Highlight matching cells to make the visual search aspect real
        // (There may be multiple cells with the same letter)
        const matchingCells = gridData.filter(c => c.sym === target.sym);

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                if (destroyed) return;
                const val = parseInt(input.value, 10);
                if (isNaN(val)) return;

                total++;
                const responseTime = (performance.now() - questionStart) / 1000;
                responseTimes.push(responseTime);

                // Check if the entered number belongs to any cell with the target symbol
                const isCorrect = matchingCells.some(c => c.num === val);
                if (isCorrect) correct++;

                // Visual feedback
                input.style.borderColor = isCorrect ? 'var(--accent-green)' : 'var(--danger)';

                // Highlight the correct cell
                const cells = ctx.container.querySelectorAll('.vs-cell');
                cells.forEach(cell => {
                    if (parseInt(cell.dataset.num) === target.num) {
                        cell.classList.add('target');
                    }
                });

                ctx.onUpdateHud({ score: correct, question: `Found: ${correct}` });

                setTimeout(() => showRound(), 500);
            }
        });
    }

    function finishTest() {
        if (destroyed) return;
        destroyed = true;
        ctx.stopTimer();

        const avgTime = responseTimes.length > 0
            ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
            : 0;

        // Score based on correct answers (work rate test)
        let percentile;
        if (correct <= 4) percentile = 2;
        else if (correct <= 7) percentile = 7;
        else if (correct <= 10) percentile = 17;
        else if (correct <= 14) percentile = 31;
        else if (correct <= 18) percentile = 50;
        else if (correct <= 23) percentile = 68;
        else if (correct <= 28) percentile = 83;
        else if (correct <= 34) percentile = 92;
        else percentile = 98;

        ctx.onComplete({
            correct,
            total,
            avgTime,
            stanine: percentileToStanine(percentile),
            details: `Found ${correct} tiles correctly out of ${total} attempts. Avg search time: ${avgTime.toFixed(1)}s.`,
        });
    }

    return {
        start() {
            ctx.startTimer(240);
            showRound();
        },
        onTimeUp() { finishTest(); },
        destroy() { destroyed = true; },
    };
}
