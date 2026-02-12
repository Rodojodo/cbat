// ============================================
// Sensory Motor Apparatus (SMA) Test
// Track a drifting dot using the mouse
// ============================================

import { percentileToStanine } from '../scoring.js';

export function getInstructions() {
    return `
        <p>This test measures your eye-hand coordination and fine motor control.</p>
        <ul>
            <li>A <span style="color:#c8102e">red dot</span> will drift around the screen.</li>
            <li>Move your mouse to keep the <span style="color:#22c55e">green cursor</span> aligned with the red dot.</li>
            <li>The dot constantly drifts — you must continuously correct your position.</li>
            <li>Your score is based on how closely you track the dot over time.</li>
            <li>In the real CBAT, this uses a joystick and foot pedals. Here, the mouse simulates both axes.</li>
            <li>You have <strong>3 minutes</strong>.</li>
        </ul>
    `;
}

export function create(ctx) {
    let destroyed = false;
    let animFrame = null;
    let containerEl = null;

    // Dot position and drift
    let dotX = 300;
    let dotY = 300;
    let dotVX = 0;
    let dotVY = 0;
    let driftAngle = Math.random() * Math.PI * 2;
    let driftSpeed = 1.5;

    // Cursor position
    let cursorX = 300;
    let cursorY = 300;

    // Tracking accuracy
    let sampleCount = 0;
    let totalDistance = 0;
    let perfectSamples = 0; // within 15px
    let goodSamples = 0;    // within 30px
    let lastTime = 0;
    let difficultyTimer = 0;

    function onMouseMove(e) {
        if (!containerEl || destroyed) return;
        const rect = containerEl.getBoundingClientRect();
        cursorX = e.clientX - rect.left;
        cursorY = e.clientY - rect.top;

        // Clamp
        cursorX = Math.max(0, Math.min(containerEl.clientWidth, cursorX));
        cursorY = Math.max(0, Math.min(containerEl.clientHeight, cursorY));
    }

    function update(timestamp) {
        if (destroyed) return;
        const dt = Math.min((timestamp - lastTime) / 16, 3);
        lastTime = timestamp;
        difficultyTimer += dt;

        // Increase difficulty over time
        if (difficultyTimer > 300) { // ~5 sec intervals
            driftSpeed = Math.min(4, driftSpeed + 0.05);
            difficultyTimer = 0;
        }

        // Randomly change drift direction
        driftAngle += (Math.random() - 0.5) * 0.15 * dt;

        // Apply random perturbations
        if (Math.random() < 0.02 * dt) {
            driftAngle = Math.random() * Math.PI * 2;
        }

        dotVX = Math.cos(driftAngle) * driftSpeed * dt;
        dotVY = Math.sin(driftAngle) * driftSpeed * dt;

        dotX += dotVX;
        dotY += dotVY;

        const w = containerEl ? containerEl.clientWidth : 600;
        const h = containerEl ? containerEl.clientHeight : 600;

        // Bounce off walls
        if (dotX < 30) { dotX = 30; driftAngle = Math.PI - driftAngle; }
        if (dotX > w - 30) { dotX = w - 30; driftAngle = Math.PI - driftAngle; }
        if (dotY < 30) { dotY = 30; driftAngle = -driftAngle; }
        if (dotY > h - 30) { dotY = h - 30; driftAngle = -driftAngle; }

        // Measure tracking accuracy
        const dx = dotX - cursorX;
        const dy = dotY - cursorY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        sampleCount++;
        totalDistance += dist;
        if (dist < 15) perfectSamples++;
        if (dist < 30) goodSamples++;

        // Draw
        draw(w, h, dist);

        animFrame = requestAnimationFrame(update);
    }

    function draw(w, h, currentDist) {
        if (!containerEl) return;

        const dotEl = containerEl.querySelector('.sma-dot');
        const cursorEl = containerEl.querySelector('.sma-cursor');
        const meterEl = containerEl.querySelector('.sma-accuracy-meter');

        if (dotEl) {
            dotEl.style.left = dotX + 'px';
            dotEl.style.top = dotY + 'px';
        }
        if (cursorEl) {
            cursorEl.style.left = cursorX + 'px';
            cursorEl.style.top = cursorY + 'px';

            // Change cursor color based on distance
            if (currentDist < 15) {
                cursorEl.style.borderColor = '#22c55e';
            } else if (currentDist < 30) {
                cursorEl.style.borderColor = '#eab308';
            } else {
                cursorEl.style.borderColor = '#ef4444';
            }
        }
        if (meterEl && sampleCount > 0) {
            const accuracy = Math.round((goodSamples / sampleCount) * 100);
            meterEl.textContent = `Accuracy: ${accuracy}% | Distance: ${Math.round(currentDist)}px`;
        }
    }

    function finishTest() {
        if (destroyed) return;
        destroyed = true;
        if (animFrame) cancelAnimationFrame(animFrame);
        containerEl?.removeEventListener('mousemove', onMouseMove);

        const avgDist = sampleCount > 0 ? totalDistance / sampleCount : 999;
        const perfectPct = sampleCount > 0 ? (perfectSamples / sampleCount) * 100 : 0;
        const goodPct = sampleCount > 0 ? (goodSamples / sampleCount) * 100 : 0;

        // Scoring based on percentage of time within tracking range
        let percentile;
        if (goodPct < 15) percentile = 2;
        else if (goodPct < 25) percentile = 7;
        else if (goodPct < 35) percentile = 17;
        else if (goodPct < 45) percentile = 31;
        else if (goodPct < 55) percentile = 50;
        else if (goodPct < 65) percentile = 68;
        else if (goodPct < 75) percentile = 83;
        else if (goodPct < 85) percentile = 92;
        else percentile = 98;

        // Bonus for precision
        if (perfectPct > 50) percentile = Math.min(99, percentile + 5);

        ctx.onComplete({
            correct: goodSamples,
            total: sampleCount,
            stanine: percentileToStanine(percentile),
            details: `Tracking precision: ${Math.round(goodPct)}% within range, ${Math.round(perfectPct)}% precise. Avg distance: ${avgDist.toFixed(1)}px. Drift speed reached: ${driftSpeed.toFixed(1)}.`,
        });
    }

    return {
        start() {
            const w = Math.min(600, window.innerWidth - 40);
            const h = Math.min(500, window.innerHeight - 200);

            ctx.container.innerHTML = `
                <p class="text-muted mb-2">Keep the green circle on the red dot</p>
                <div class="sma-container" style="width:${w}px;height:${h}px">
                    <div class="sma-crosshair">
                        <div class="sma-crosshair-h"></div>
                        <div class="sma-crosshair-v"></div>
                    </div>
                    <div class="sma-dot"></div>
                    <div class="sma-cursor"></div>
                    <div class="sma-accuracy-meter">Accuracy: --</div>
                </div>
            `;

            containerEl = ctx.container.querySelector('.sma-container');

            dotX = w / 2;
            dotY = h / 2;
            cursorX = w / 2;
            cursorY = h / 2;

            containerEl.addEventListener('mousemove', onMouseMove);

            lastTime = performance.now();
            animFrame = requestAnimationFrame(update);

            ctx.startTimer(180); // 3 min
        },

        onTimeUp() {
            finishTest();
        },

        destroy() {
            destroyed = true;
            if (animFrame) cancelAnimationFrame(animFrame);
            containerEl?.removeEventListener('mousemove', onMouseMove);
        },
    };
}
