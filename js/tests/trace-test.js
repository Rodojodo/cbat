// ============================================
// Trace Test 1 (TRAC1)
// Mirror aircraft control inputs based on orientation
// ============================================

import { percentileToStanine } from '../scoring.js';

export function getInstructions() {
    return `
        <p>This test measures your ability to mirror aircraft control inputs, accounting for the aircraft's orientation.</p>
        <ul>
            <li>A <span style="color:#ef4444">red aircraft</span> flies on screen in various orientations.</li>
            <li>You must press the arrow keys to <strong>mimic the controls as if you were the pilot</strong>.</li>
            <li>A <strong>direction prompt</strong> will appear (e.g., "TURN LEFT"). Press the correct key from the <em>pilot's perspective</em>.</li>
            <li>When the aircraft faces <strong>away from you</strong>: left = ← , right = →</li>
            <li>When the aircraft faces <strong>toward you</strong>: left = → , right = ← (mirrored!)</li>
            <li><span class="key-hint">↑</span> always means pitch up (pull back), <span class="key-hint">↓</span> always means pitch down.</li>
            <li>In later rounds, the aircraft may also be banked or inverted, making it harder.</li>
            <li>You have <strong>4 minutes</strong>.</li>
        </ul>
    `;
}

export function create(ctx) {
    let correct = 0;
    let total = 0;
    let destroyed = false;
    let responseTimes = [];
    let round = 0;
    let currentCorrectKey = null;
    let canvas = null;
    let canvasCtx = null;
    let waiting = false;

    const COMMANDS = ['TURN LEFT', 'TURN RIGHT', 'PITCH UP', 'PITCH DOWN'];

    function generateRound() {
        // Aircraft orientation: facing direction and bank
        const facingAngles = [0, 45, 90, 135, 180, 225, 270, 315]; // 0 = facing away (up screen)
        const bankAngles = round < 10 ? [0] : [-30, -15, 0, 15, 30];
        const inverted = round >= 15 ? Math.random() > 0.6 : false;

        const facing = facingAngles[Math.floor(Math.random() * Math.min(facingAngles.length, 2 + Math.floor(round / 3)))];
        const bank = bankAngles[Math.floor(Math.random() * bankAngles.length)];
        const command = COMMANDS[Math.floor(Math.random() * COMMANDS.length)];

        // Determine correct key press from pilot's perspective
        // The pilot sits in the aircraft. If the aircraft faces away (0°), pilot's left = screen left.
        // If facing toward (180°), pilot's left = screen right (mirrored).
        let correctKey;

        if (command === 'PITCH UP') {
            correctKey = inverted ? 'ArrowDown' : 'ArrowUp';
        } else if (command === 'PITCH DOWN') {
            correctKey = inverted ? 'ArrowUp' : 'ArrowDown';
        } else {
            // For TURN LEFT/RIGHT, we need to account for the aircraft's facing direction
            const facingRad = (facing * Math.PI) / 180;

            // Pilot's left is perpendicular to facing direction
            // Facing 0 (up/away): pilot's left = screen left (-x)
            // Facing 180 (down/toward): pilot's left = screen right (+x)
            // Facing 90 (right): pilot's left = screen up (-y)
            // Facing 270 (left): pilot's left = screen down (+y)

            if (command === 'TURN LEFT') {
                // Pilot turns left
                if (inverted) {
                    // Inverted: left becomes right
                    correctKey = getKeyForDirection(facing + 90);
                } else {
                    correctKey = getKeyForDirection(facing - 90);
                }
            } else {
                // TURN RIGHT
                if (inverted) {
                    correctKey = getKeyForDirection(facing - 90);
                } else {
                    correctKey = getKeyForDirection(facing + 90);
                }
            }
        }

        return { facing, bank, inverted, command, correctKey };
    }

    function getKeyForDirection(angleDeg) {
        // Normalize angle
        const a = ((angleDeg % 360) + 360) % 360;
        // Map angle to closest arrow key
        if (a >= 315 || a < 45) return 'ArrowUp';
        if (a >= 45 && a < 135) return 'ArrowRight';
        if (a >= 135 && a < 225) return 'ArrowDown';
        return 'ArrowLeft';
    }

    function drawAircraft(facing, bank, inverted, command) {
        if (!canvasCtx) return;
        const w = canvas.width;
        const h = canvas.height;
        const cx = w / 2;
        const cy = h / 2;

        canvasCtx.clearRect(0, 0, w, h);
        canvasCtx.fillStyle = '#080c15';
        canvasCtx.fillRect(0, 0, w, h);

        // Grid background
        canvasCtx.strokeStyle = 'rgba(42,58,85,0.3)';
        canvasCtx.lineWidth = 1;
        for (let x = 0; x < w; x += 40) {
            canvasCtx.beginPath(); canvasCtx.moveTo(x, 0); canvasCtx.lineTo(x, h); canvasCtx.stroke();
        }
        for (let y = 0; y < h; y += 40) {
            canvasCtx.beginPath(); canvasCtx.moveTo(0, y); canvasCtx.lineTo(w, y); canvasCtx.stroke();
        }

        canvasCtx.save();
        canvasCtx.translate(cx, cy);

        // Rotate for facing direction
        canvasCtx.rotate((facing * Math.PI) / 180);

        // Apply bank
        canvasCtx.rotate((bank * Math.PI) / 180);

        // Scale for inversion
        if (inverted) {
            canvasCtx.scale(1, -1);
        }

        const scale = 2.5;

        // Draw aircraft body
        canvasCtx.fillStyle = '#ef4444';
        canvasCtx.strokeStyle = '#ff6b6b';
        canvasCtx.lineWidth = 2;

        // Fuselage
        canvasCtx.beginPath();
        canvasCtx.moveTo(0, -40 * scale);     // nose
        canvasCtx.lineTo(5 * scale, -20 * scale);
        canvasCtx.lineTo(5 * scale, 25 * scale);
        canvasCtx.lineTo(0, 30 * scale);       // tail
        canvasCtx.lineTo(-5 * scale, 25 * scale);
        canvasCtx.lineTo(-5 * scale, -20 * scale);
        canvasCtx.closePath();
        canvasCtx.fill();
        canvasCtx.stroke();

        // Wings
        canvasCtx.beginPath();
        canvasCtx.moveTo(-35 * scale, 5 * scale);
        canvasCtx.lineTo(-5 * scale, -5 * scale);
        canvasCtx.lineTo(5 * scale, -5 * scale);
        canvasCtx.lineTo(35 * scale, 5 * scale);
        canvasCtx.lineTo(5 * scale, 8 * scale);
        canvasCtx.lineTo(-5 * scale, 8 * scale);
        canvasCtx.closePath();
        canvasCtx.fill();
        canvasCtx.stroke();

        // Tail wings
        canvasCtx.beginPath();
        canvasCtx.moveTo(-15 * scale, 22 * scale);
        canvasCtx.lineTo(0, 18 * scale);
        canvasCtx.lineTo(15 * scale, 22 * scale);
        canvasCtx.lineTo(0, 25 * scale);
        canvasCtx.closePath();
        canvasCtx.fill();
        canvasCtx.stroke();

        // Cockpit
        canvasCtx.fillStyle = '#fbbf24';
        canvasCtx.beginPath();
        canvasCtx.ellipse(0, -25 * scale, 3 * scale, 6 * scale, 0, 0, Math.PI * 2);
        canvasCtx.fill();

        canvasCtx.restore();

        // Draw command text
        canvasCtx.fillStyle = '#fbbf24';
        canvasCtx.font = 'bold 28px sans-serif';
        canvasCtx.textAlign = 'center';
        canvasCtx.fillText(command, cx, 40);

        // Draw orientation info
        canvasCtx.fillStyle = '#8899b3';
        canvasCtx.font = '14px sans-serif';
        const facingLabel = getFacingLabel(facing);
        canvasCtx.fillText(`Aircraft facing: ${facingLabel}${inverted ? ' (INVERTED)' : ''}${bank !== 0 ? ` Bank: ${bank}°` : ''}`, cx, h - 15);
    }

    function getFacingLabel(deg) {
        const labels = { 0: 'Away ↑', 45: 'Away-Right ↗', 90: 'Right →', 135: 'Toward-Right ↘', 180: 'Toward ↓', 225: 'Toward-Left ↙', 270: 'Left ←', 315: 'Away-Left ↖' };
        return labels[deg] || `${deg}°`;
    }

    function showRound() {
        if (destroyed) return;

        const config = generateRound();
        currentCorrectKey = config.correctKey;
        waiting = true;

        const questionStart = performance.now();

        if (!canvas) {
            ctx.container.innerHTML = `
                <canvas id="trace-canvas" class="trace-canvas" width="500" height="500"></canvas>
                <p class="trace-controls-hint">
                    Use arrow keys: ← → ↑ ↓ (from the pilot's perspective)
                </p>
            `;
            canvas = document.getElementById('trace-canvas');
            canvasCtx = canvas.getContext('2d');
        }

        drawAircraft(config.facing, config.bank, config.inverted, config.command);

        ctx.onUpdateHud({ question: `Round ${round + 1}`, score: correct });

        // Handle key press
        function onKey(e) {
            if (!waiting || destroyed) return;
            if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
            e.preventDefault();

            waiting = false;
            document.removeEventListener('keydown', onKey);

            total++;
            round++;
            const responseTime = (performance.now() - questionStart) / 1000;
            responseTimes.push(responseTime);

            const isCorrect = e.key === currentCorrectKey;
            if (isCorrect) correct++;

            // Flash feedback
            const color = isCorrect ? '#22c55e' : '#ef4444';
            canvasCtx.fillStyle = color;
            canvasCtx.globalAlpha = 0.3;
            canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
            canvasCtx.globalAlpha = 1;

            // Show correct key if wrong
            if (!isCorrect) {
                canvasCtx.fillStyle = '#fff';
                canvasCtx.font = 'bold 20px sans-serif';
                canvasCtx.textAlign = 'center';
                const keyLabel = { ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→' };
                canvasCtx.fillText(`Correct: ${keyLabel[currentCorrectKey]}`, canvas.width / 2, canvas.height / 2 + 80);
            }

            ctx.onUpdateHud({ score: correct });

            setTimeout(() => showRound(), 400);
        }

        document.addEventListener('keydown', onKey);
    }

    function finishTest() {
        if (destroyed) return;
        destroyed = true;
        ctx.stopTimer();

        const avgTime = responseTimes.length > 0
            ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
            : 0;

        const pct = total > 0 ? (correct / total) * 100 : 0;
        // Also factor in speed (reactions should be quick)
        const speedBonus = avgTime < 1.5 ? 10 : avgTime < 2 ? 5 : 0;

        let percentile;
        if (pct < 25) percentile = 2;
        else if (pct < 35) percentile = 7;
        else if (pct < 45) percentile = 17;
        else if (pct < 55) percentile = 31;
        else if (pct < 65) percentile = 50;
        else if (pct < 75) percentile = 68;
        else if (pct < 85) percentile = 83;
        else if (pct < 92) percentile = 92;
        else percentile = 98;

        percentile = Math.min(99, percentile + speedBonus);

        ctx.onComplete({
            correct,
            total,
            avgTime,
            stanine: percentileToStanine(percentile),
            details: `Completed ${total} orientation challenges. Average reaction time: ${avgTime.toFixed(2)}s. Difficulty increased with facing direction${round >= 10 ? ', bank angles' : ''}${round >= 15 ? ', and inversions' : ''}.`,
        });
    }

    return {
        start() {
            ctx.startTimer(240); // 4 min
            showRound();
        },
        onTimeUp() { finishTest(); },
        destroy() {
            destroyed = true;
            waiting = false;
        },
    };
}
