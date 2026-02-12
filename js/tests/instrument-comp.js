// ============================================
// Instrument Comprehension Test
// Read flight instruments, match to aircraft orientation
// ============================================

import { percentileToStanine } from '../scoring.js';

export function getInstructions() {
    return `
        <p>This test measures your ability to interpret flight instruments and visualise aircraft orientation.</p>
        <ul>
            <li>You will see two instruments: an <strong>Attitude Indicator</strong> and a <strong>Heading Indicator</strong>.</li>
            <li>The Attitude Indicator shows pitch (nose up/down) and bank (roll left/right). Blue = sky, brown = ground.</li>
            <li>The Heading Indicator shows the compass direction the aircraft is flying.</li>
            <li>Select the aircraft image that matches both instruments.</li>
            <li>Use process of elimination — check heading first, then pitch/bank.</li>
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

    const TOTAL_ROUNDS = 16;

    const HEADINGS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const HEADING_DEGS = { N: 0, NE: 45, E: 90, SE: 135, S: 180, SW: 225, W: 270, NW: 315 };
    const BANKS = [-30, -15, 0, 15, 30];
    const PITCHES = [-15, -10, 0, 10, 15];

    function generateQuestion() {
        const heading = HEADINGS[Math.floor(Math.random() * HEADINGS.length)];
        const bank = BANKS[Math.floor(Math.random() * BANKS.length)];
        const pitch = PITCHES[Math.floor(Math.random() * PITCHES.length)];

        const correctAnswer = { heading, bank, pitch };

        // Generate 3 wrong answers
        const options = [correctAnswer];
        while (options.length < 4) {
            const wrongHeading = HEADINGS[Math.floor(Math.random() * HEADINGS.length)];
            const wrongBank = BANKS[Math.floor(Math.random() * BANKS.length)];
            const wrongPitch = PITCHES[Math.floor(Math.random() * PITCHES.length)];

            // Make sure it differs in at least one attribute
            if (wrongHeading === heading && wrongBank === bank && wrongPitch === pitch) continue;

            // Avoid duplicates
            const dup = options.some(o => o.heading === wrongHeading && o.bank === wrongBank && o.pitch === wrongPitch);
            if (!dup) {
                options.push({ heading: wrongHeading, bank: wrongBank, pitch: wrongPitch });
            }
        }

        // Shuffle
        for (let i = options.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [options[i], options[j]] = [options[j], options[i]];
        }

        return { correctAnswer, options, correctIndex: options.indexOf(correctAnswer) };
    }

    function drawAttitudeIndicator(canvas, pitch, bank) {
        const ctx2d = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;
        const cx = w / 2;
        const cy = h / 2;
        const r = Math.min(w, h) / 2 - 4;

        ctx2d.clearRect(0, 0, w, h);
        ctx2d.save();

        // Clip to circle
        ctx2d.beginPath();
        ctx2d.arc(cx, cy, r, 0, Math.PI * 2);
        ctx2d.clip();

        // Transform for bank and pitch
        ctx2d.translate(cx, cy);
        ctx2d.rotate((-bank * Math.PI) / 180);
        const pitchOffset = (pitch / 90) * r * 2;
        ctx2d.translate(0, pitchOffset);

        // Sky (blue)
        ctx2d.fillStyle = '#1a6fc4';
        ctx2d.fillRect(-r * 2, -r * 4, r * 4, r * 4);

        // Ground (brown)
        ctx2d.fillStyle = '#8B6914';
        ctx2d.fillRect(-r * 2, 0, r * 4, r * 4);

        // Horizon line
        ctx2d.strokeStyle = '#fff';
        ctx2d.lineWidth = 2;
        ctx2d.beginPath();
        ctx2d.moveTo(-r * 2, 0);
        ctx2d.lineTo(r * 2, 0);
        ctx2d.stroke();

        // Pitch lines
        ctx2d.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx2d.lineWidth = 1;
        ctx2d.font = '10px sans-serif';
        ctx2d.fillStyle = '#fff';
        ctx2d.textAlign = 'center';
        for (let p = -40; p <= 40; p += 10) {
            if (p === 0) continue;
            const y = -(p / 90) * r * 2;
            const lineW = p % 20 === 0 ? r * 0.4 : r * 0.2;
            ctx2d.beginPath();
            ctx2d.moveTo(-lineW, y);
            ctx2d.lineTo(lineW, y);
            ctx2d.stroke();
            if (p % 20 === 0) {
                ctx2d.fillText(`${Math.abs(p)}`, lineW + 14, y + 4);
            }
        }

        ctx2d.restore();

        // Fixed aircraft symbol (white wings)
        ctx2d.strokeStyle = '#fbbf24';
        ctx2d.lineWidth = 3;
        // Left wing
        ctx2d.beginPath();
        ctx2d.moveTo(cx - r * 0.5, cy);
        ctx2d.lineTo(cx - r * 0.15, cy);
        ctx2d.stroke();
        // Right wing
        ctx2d.beginPath();
        ctx2d.moveTo(cx + r * 0.15, cy);
        ctx2d.lineTo(cx + r * 0.5, cy);
        ctx2d.stroke();
        // Center dot
        ctx2d.fillStyle = '#fbbf24';
        ctx2d.beginPath();
        ctx2d.arc(cx, cy, 4, 0, Math.PI * 2);
        ctx2d.fill();

        // Bank indicator at top
        ctx2d.save();
        ctx2d.translate(cx, cy);
        // Bank triangle at current bank
        const bankRad = (-bank * Math.PI) / 180;
        const triX = (r - 8) * Math.sin(bankRad);
        const triY = -(r - 8) * Math.cos(bankRad);
        ctx2d.fillStyle = '#fff';
        ctx2d.beginPath();
        ctx2d.moveTo(triX, triY);
        ctx2d.lineTo(triX - 6, triY - 12);
        ctx2d.lineTo(triX + 6, triY - 12);
        ctx2d.closePath();
        ctx2d.fill();

        // Fixed top reference
        ctx2d.fillStyle = '#fbbf24';
        ctx2d.beginPath();
        ctx2d.moveTo(0, -r + 2);
        ctx2d.lineTo(-6, -r + 14);
        ctx2d.lineTo(6, -r + 14);
        ctx2d.closePath();
        ctx2d.fill();
        ctx2d.restore();

        // Border
        ctx2d.strokeStyle = '#5a6a82';
        ctx2d.lineWidth = 3;
        ctx2d.beginPath();
        ctx2d.arc(cx, cy, r, 0, Math.PI * 2);
        ctx2d.stroke();
    }

    function drawHeadingIndicator(canvas, headingDeg) {
        const ctx2d = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;
        const cx = w / 2;
        const cy = h / 2;
        const r = Math.min(w, h) / 2 - 4;

        ctx2d.clearRect(0, 0, w, h);

        // Background
        ctx2d.fillStyle = '#111';
        ctx2d.beginPath();
        ctx2d.arc(cx, cy, r, 0, Math.PI * 2);
        ctx2d.fill();

        ctx2d.save();
        ctx2d.translate(cx, cy);
        ctx2d.rotate((-headingDeg * Math.PI) / 180);

        // Compass markings
        const labels = { 0: 'N', 90: 'E', 180: 'S', 270: 'W' };
        for (let deg = 0; deg < 360; deg += 10) {
            const rad = ((deg - 90) * Math.PI) / 180;
            const isMajor = deg % 30 === 0;
            const inner = isMajor ? r - 20 : r - 10;

            ctx2d.strokeStyle = '#8899b3';
            ctx2d.lineWidth = isMajor ? 2 : 1;
            ctx2d.beginPath();
            ctx2d.moveTo(inner * Math.cos(rad), inner * Math.sin(rad));
            ctx2d.lineTo((r - 2) * Math.cos(rad), (r - 2) * Math.sin(rad));
            ctx2d.stroke();

            if (deg % 30 === 0) {
                const label = labels[deg] || String(deg / 10);
                const labelR = r - 30;
                ctx2d.save();
                ctx2d.translate(labelR * Math.cos(rad), labelR * Math.sin(rad));
                ctx2d.rotate(rad + Math.PI / 2);
                ctx2d.fillStyle = labels[deg] ? '#fbbf24' : '#e0e6f0';
                ctx2d.font = labels[deg] ? 'bold 14px sans-serif' : '11px sans-serif';
                ctx2d.textAlign = 'center';
                ctx2d.textBaseline = 'middle';
                ctx2d.fillText(label, 0, 0);
                ctx2d.restore();
            }
        }

        ctx2d.restore();

        // Fixed aircraft symbol at top
        ctx2d.fillStyle = '#fbbf24';
        ctx2d.beginPath();
        ctx2d.moveTo(cx, cy - r + 2);
        ctx2d.lineTo(cx - 8, cy - r + 18);
        ctx2d.lineTo(cx + 8, cy - r + 18);
        ctx2d.closePath();
        ctx2d.fill();

        // Lubber line
        ctx2d.strokeStyle = '#fbbf24';
        ctx2d.lineWidth = 2;
        ctx2d.beginPath();
        ctx2d.moveTo(cx, cy - r + 18);
        ctx2d.lineTo(cx, cy - r * 0.4);
        ctx2d.stroke();

        // Border
        ctx2d.strokeStyle = '#5a6a82';
        ctx2d.lineWidth = 3;
        ctx2d.beginPath();
        ctx2d.arc(cx, cy, r, 0, Math.PI * 2);
        ctx2d.stroke();
    }

    function drawAircraftOption(canvas, heading, bank, pitch) {
        const ctx2d = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;
        const cx = w / 2;
        const cy = h / 2;

        ctx2d.clearRect(0, 0, w, h);
        ctx2d.fillStyle = '#1a2235';
        ctx2d.fillRect(0, 0, w, h);

        ctx2d.save();
        ctx2d.translate(cx, cy);

        // Bank (roll)
        ctx2d.rotate((bank * Math.PI) / 180);

        // Draw simplified aircraft from above/front
        const scale = 0.6;

        // Fuselage
        ctx2d.strokeStyle = '#e0e6f0';
        ctx2d.lineWidth = 2;
        ctx2d.fillStyle = '#2a3a55';

        // Adjust for pitch — aircraft appears more elongated or compressed
        const pitchScale = 1 - (Math.abs(pitch) / 90) * 0.4;
        const noseOffset = (pitch / 90) * 30;

        // Body
        ctx2d.beginPath();
        ctx2d.ellipse(0, noseOffset * 0.3, 6 * scale, 35 * scale * pitchScale, 0, 0, Math.PI * 2);
        ctx2d.fill();
        ctx2d.stroke();

        // Wings
        const wingY = 5 + noseOffset * 0.2;
        ctx2d.beginPath();
        ctx2d.moveTo(-45 * scale, wingY);
        ctx2d.lineTo(-8 * scale, wingY - 5);
        ctx2d.lineTo(8 * scale, wingY - 5);
        ctx2d.lineTo(45 * scale, wingY);
        ctx2d.lineTo(8 * scale, wingY + 3);
        ctx2d.lineTo(-8 * scale, wingY + 3);
        ctx2d.closePath();
        ctx2d.fill();
        ctx2d.stroke();

        // Tail
        const tailY = 28 * scale * pitchScale + noseOffset * 0.3;
        ctx2d.beginPath();
        ctx2d.moveTo(-15 * scale, tailY);
        ctx2d.lineTo(0, tailY - 5);
        ctx2d.lineTo(15 * scale, tailY);
        ctx2d.closePath();
        ctx2d.fill();
        ctx2d.stroke();

        // Nose dot
        ctx2d.fillStyle = '#ef4444';
        ctx2d.beginPath();
        ctx2d.arc(0, -30 * scale * pitchScale + noseOffset * 0.3, 3, 0, Math.PI * 2);
        ctx2d.fill();

        ctx2d.restore();

        // Heading label
        ctx2d.fillStyle = '#8899b3';
        ctx2d.font = '11px sans-serif';
        ctx2d.textAlign = 'center';
        ctx2d.fillText(`Hdg: ${heading}`, cx, h - 6);

        // Pitch indicator
        const pitchText = pitch === 0 ? 'Level' : pitch > 0 ? `Nose Up ${pitch}°` : `Nose Down ${Math.abs(pitch)}°`;
        ctx2d.fillText(pitchText, cx, 14);
    }

    function showRound() {
        if (destroyed || round >= TOTAL_ROUNDS) {
            finishTest();
            return;
        }

        const q = generateQuestion();
        const questionStart = performance.now();
        const headingDeg = HEADING_DEGS[q.correctAnswer.heading];

        ctx.container.innerHTML = `
            <p class="text-muted mb-2">Which aircraft matches these instruments? (Round ${round + 1}/${TOTAL_ROUNDS})</p>
            <div class="insc-instruments">
                <div class="insc-instrument">
                    <canvas id="ai-canvas" width="150" height="150"></canvas>
                    <p>Attitude Indicator</p>
                </div>
                <div class="insc-instrument">
                    <canvas id="hi-canvas" width="150" height="150"></canvas>
                    <p>Heading Indicator</p>
                </div>
            </div>
            <div class="insc-options" id="insc-options"></div>
        `;

        drawAttitudeIndicator(document.getElementById('ai-canvas'), q.correctAnswer.pitch, q.correctAnswer.bank);
        drawHeadingIndicator(document.getElementById('hi-canvas'), headingDeg);

        const optContainer = document.getElementById('insc-options');
        q.options.forEach((opt, idx) => {
            const div = document.createElement('div');
            div.className = 'insc-option';
            div.innerHTML = `<canvas width="120" height="120"></canvas>`;
            const optCanvas = div.querySelector('canvas');
            drawAircraftOption(optCanvas, opt.heading, opt.bank, opt.pitch);

            div.addEventListener('click', () => {
                if (destroyed) return;
                total++;
                round++;
                const responseTime = (performance.now() - questionStart) / 1000;
                responseTimes.push(responseTime);

                const isCorrect = idx === q.correctIndex;
                if (isCorrect) correct++;

                div.classList.add(isCorrect ? 'correct' : 'wrong');
                if (!isCorrect) {
                    optContainer.children[q.correctIndex].classList.add('correct');
                }

                ctx.onUpdateHud({ score: correct, question: `${round}/${TOTAL_ROUNDS}` });
                setTimeout(() => showRound(), 600);
            });

            optContainer.appendChild(div);
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
        });
    }

    return {
        start() {
            ctx.startTimer(300);
            showRound();
        },
        onTimeUp() { finishTest(); },
        destroy() { destroyed = true; },
    };
}
