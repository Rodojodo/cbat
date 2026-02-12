// ============================================
// Angles, Bearings & Degrees Test
// Estimate angles and compass bearings
// ============================================

import { percentileToStanine } from '../scoring.js';

export function getInstructions() {
    return `
        <p>This test measures your ability to judge angles and compass bearings.</p>
        <ul>
            <li><strong>Part 1 — Angles:</strong> An angle is shown on screen. Select the closest estimate from the options.</li>
            <li><strong>Part 2 — Bearings:</strong> A compass bearing is shown. Select the correct bearing from the options.</li>
            <li>All bearings are measured clockwise from North (000° = North, 090° = East, 180° = South, 270° = West).</li>
            <li>Options become closer together as you progress, requiring finer judgement.</li>
            <li>You have <strong>5 minutes</strong>.</li>
        </ul>
    `;
}

export function create(ctx) {
    let correct = 0;
    let total = 0;
    let destroyed = false;
    let round = 0;
    let responseTimes = [];

    const TOTAL_ROUNDS = 24;
    // First 12 are angle estimation, last 12 are bearings

    function generateAngleQuestion() {
        const trueAngle = Math.floor(Math.random() * 350) + 5; // 5-355
        const spread = Math.max(5, 30 - round * 2); // Options get closer

        const options = [trueAngle];
        while (options.length < 4) {
            let offset = (Math.floor(Math.random() * 3) + 1) * spread;
            if (Math.random() < 0.5) offset = -offset;
            let opt = trueAngle + offset;
            opt = ((opt % 360) + 360) % 360;
            if (!options.includes(opt) && opt > 0) {
                options.push(opt);
            }
        }

        return {
            type: 'angle',
            trueAngle,
            options: options.sort(() => Math.random() - 0.5),
            answer: trueAngle,
        };
    }

    function generateBearingQuestion() {
        const trueBearing = Math.floor(Math.random() * 36) * 10; // Multiples of 10
        const spread = Math.max(10, 40 - (round - 12) * 3);

        const options = [trueBearing];
        while (options.length < 4) {
            let offset = (Math.floor(Math.random() * 3) + 1) * spread;
            if (Math.random() < 0.5) offset = -offset;
            let opt = ((trueBearing + offset) % 360 + 360) % 360;
            if (!options.includes(opt)) {
                options.push(opt);
            }
        }

        return {
            type: 'bearing',
            trueAngle: trueBearing,
            options: options.sort(() => Math.random() - 0.5),
            answer: trueBearing,
        };
    }

    function drawAngle(canvas, angle) {
        const ctx2d = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;
        const cx = w / 2;
        const cy = h / 2;
        const radius = Math.min(w, h) * 0.35;

        ctx2d.clearRect(0, 0, w, h);

        // Background
        ctx2d.fillStyle = '#1e2a40';
        ctx2d.fillRect(0, 0, w, h);

        // Draw the angle arc
        const startAngle = 0;
        const endAngle = (angle * Math.PI) / 180;

        // First line (horizontal right)
        ctx2d.strokeStyle = '#60a5fa';
        ctx2d.lineWidth = 3;
        ctx2d.beginPath();
        ctx2d.moveTo(cx, cy);
        ctx2d.lineTo(cx + radius, cy);
        ctx2d.stroke();

        // Second line (at angle)
        ctx2d.strokeStyle = '#f97316';
        ctx2d.beginPath();
        ctx2d.moveTo(cx, cy);
        ctx2d.lineTo(
            cx + radius * Math.cos(-endAngle),
            cy - radius * Math.sin(-endAngle) // Canvas Y is inverted; measure counter-clockwise visually
        );
        ctx2d.stroke();

        // Arc
        ctx2d.strokeStyle = '#eab308';
        ctx2d.lineWidth = 2;
        ctx2d.beginPath();
        // Draw arc counter-clockwise from 0 to angle (visually)
        ctx2d.arc(cx, cy, radius * 0.3, 0, -endAngle, true);
        ctx2d.stroke();

        // Center dot
        ctx2d.fillStyle = '#fff';
        ctx2d.beginPath();
        ctx2d.arc(cx, cy, 4, 0, Math.PI * 2);
        ctx2d.fill();
    }

    function drawBearing(canvas, bearing) {
        const ctx2d = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;
        const cx = w / 2;
        const cy = h / 2;
        const radius = Math.min(w, h) * 0.38;

        ctx2d.clearRect(0, 0, w, h);
        ctx2d.fillStyle = '#1e2a40';
        ctx2d.fillRect(0, 0, w, h);

        // Compass circle
        ctx2d.strokeStyle = '#2a3a55';
        ctx2d.lineWidth = 2;
        ctx2d.beginPath();
        ctx2d.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx2d.stroke();

        // Cardinal directions
        ctx2d.fillStyle = '#8899b3';
        ctx2d.font = '14px sans-serif';
        ctx2d.textAlign = 'center';
        ctx2d.textBaseline = 'middle';
        ctx2d.fillText('N', cx, cy - radius - 14);
        ctx2d.fillText('S', cx, cy + radius + 14);
        ctx2d.fillText('E', cx + radius + 14, cy);
        ctx2d.fillText('W', cx - radius - 14, cy);

        // Tick marks every 30°
        for (let i = 0; i < 360; i += 30) {
            const rad = (i - 90) * Math.PI / 180;
            const inner = i % 90 === 0 ? radius - 15 : radius - 8;
            ctx2d.strokeStyle = '#5a6a82';
            ctx2d.lineWidth = i % 90 === 0 ? 2 : 1;
            ctx2d.beginPath();
            ctx2d.moveTo(cx + inner * Math.cos(rad), cy + inner * Math.sin(rad));
            ctx2d.lineTo(cx + radius * Math.cos(rad), cy + radius * Math.sin(rad));
            ctx2d.stroke();
        }

        // North line (faint)
        ctx2d.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx2d.lineWidth = 1;
        ctx2d.beginPath();
        ctx2d.moveTo(cx, cy);
        ctx2d.lineTo(cx, cy - radius);
        ctx2d.stroke();

        // Bearing line
        const bearingRad = (bearing - 90) * Math.PI / 180;
        ctx2d.strokeStyle = '#ef4444';
        ctx2d.lineWidth = 3;
        ctx2d.beginPath();
        ctx2d.moveTo(cx, cy);
        ctx2d.lineTo(cx + radius * 0.9 * Math.cos(bearingRad), cy + radius * 0.9 * Math.sin(bearingRad));
        ctx2d.stroke();

        // Arrow head
        const headLen = 12;
        const headAngle = 0.4;
        const tipX = cx + radius * 0.9 * Math.cos(bearingRad);
        const tipY = cy + radius * 0.9 * Math.sin(bearingRad);
        ctx2d.fillStyle = '#ef4444';
        ctx2d.beginPath();
        ctx2d.moveTo(tipX, tipY);
        ctx2d.lineTo(
            tipX - headLen * Math.cos(bearingRad - headAngle),
            tipY - headLen * Math.sin(bearingRad - headAngle)
        );
        ctx2d.lineTo(
            tipX - headLen * Math.cos(bearingRad + headAngle),
            tipY - headLen * Math.sin(bearingRad + headAngle)
        );
        ctx2d.closePath();
        ctx2d.fill();

        // Center dot
        ctx2d.fillStyle = '#fff';
        ctx2d.beginPath();
        ctx2d.arc(cx, cy, 4, 0, Math.PI * 2);
        ctx2d.fill();
    }

    function showRound() {
        if (destroyed || round >= TOTAL_ROUNDS) {
            finishTest();
            return;
        }

        const isBearing = round >= 12;
        const q = isBearing ? generateBearingQuestion() : generateAngleQuestion();
        const questionStart = performance.now();

        ctx.container.innerHTML = `
            <p class="text-muted mb-2">${isBearing ? 'What is this compass bearing?' : 'Estimate this angle (in degrees)'}</p>
            <div class="abd-canvas-container">
                <canvas id="abd-canvas" class="abd-canvas" width="300" height="300"></canvas>
            </div>
            <div class="mc-options" id="abd-options"></div>
        `;

        const canvas = document.getElementById('abd-canvas');
        if (isBearing) {
            drawBearing(canvas, q.trueAngle);
        } else {
            drawAngle(canvas, q.trueAngle);
        }

        const optContainer = document.getElementById('abd-options');
        q.options.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'mc-btn';
            btn.textContent = `${String(opt).padStart(3, '0')}°`;
            btn.addEventListener('click', () => {
                if (destroyed) return;
                total++;
                round++;
                const responseTime = (performance.now() - questionStart) / 1000;
                responseTimes.push(responseTime);

                const isCorrect = opt === q.answer;
                if (isCorrect) correct++;

                btn.classList.add(isCorrect ? 'correct' : 'wrong');
                if (!isCorrect) {
                    optContainer.querySelectorAll('.mc-btn').forEach(b => {
                        if (b.textContent === `${String(q.answer).padStart(3, '0')}°`) b.classList.add('correct');
                    });
                }

                ctx.onUpdateHud({ score: correct, question: `${round}/${TOTAL_ROUNDS}` });
                setTimeout(() => showRound(), 500);
            });
            optContainer.appendChild(btn);
        });

        ctx.onUpdateHud({ question: `${round + 1}/${TOTAL_ROUNDS}` });
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
        else if (pct < 75) percentile = 68;
        else if (pct < 85) percentile = 83;
        else if (pct < 92) percentile = 92;
        else percentile = 98;

        ctx.onComplete({
            correct,
            total,
            avgTime,
            stanine: percentileToStanine(percentile),
            details: `${round >= 12 ? 'Completed both angles and bearings sections.' : 'Completed angles section only.'}`,
        });
    }

    return {
        start() {
            ctx.startTimer(300); // 5 min
            showRound();
        },
        onTimeUp() {
            finishTest();
        },
        destroy() {
            destroyed = true;
        },
    };
}
