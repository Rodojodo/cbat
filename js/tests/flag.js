// ============================================
// FLAG (Figures, Logistics and Groups) Test
// Multitasking: mental maths + aircraft zone tracking
// ============================================

import { percentileToStanine } from '../scoring.js';

export function getInstructions() {
    return `
        <p>This test measures your ability to multitask under pressure.</p>
        <p>You must handle <strong>two tasks simultaneously</strong>:</p>
        <ul>
            <li><strong>Mental Maths (left panel):</strong> Solve quick arithmetic problems using the on-screen keypad or your keyboard number keys.</li>
            <li><strong>Aircraft Tracking (right panel):</strong> Aircraft move across the radar display. When an aircraft enters a coloured zone, press the matching zone button:
                <ul>
                    <li><span style="color:#22c55e">Green circle</span> → press <span class="key-hint">G</span></li>
                    <li><span style="color:#eab308">Yellow triangle</span> → press <span class="key-hint">Y</span></li>
                    <li><span style="color:#ef4444">Red rectangle</span> → press <span class="key-hint">R</span></li>
                </ul>
            </li>
            <li>The pace increases over time.</li>
            <li>You have <strong>5 minutes</strong>.</li>
        </ul>
    `;
}

export function create(ctx) {
    let mathCorrect = 0;
    let mathTotal = 0;
    let zoneCorrect = 0;
    let zoneMissed = 0;
    let zoneFalse = 0;
    let destroyed = false;
    let animFrame = null;
    let mathInputValue = '';
    let currentMathAnswer = null;
    let aircraft = [];
    let zones = [];
    let activeZoneAlerts = []; // alerts that need responding to
    let canvas = null;
    let canvasCtx = null;
    let lastTime = 0;
    let speed = 1;
    let mathProblemEl = null;
    let mathInputEl = null;

    function generateMathProblem() {
        const ops = ['+', '−', '×'];
        const op = ops[Math.floor(Math.random() * ops.length)];
        let a, b, answer;

        if (op === '+') {
            a = randInt(3, 50 + mathTotal * 2);
            b = randInt(3, 50 + mathTotal * 2);
            answer = a + b;
        } else if (op === '−') {
            b = randInt(2, 30 + mathTotal);
            answer = randInt(1, 30 + mathTotal);
            a = b + answer;
        } else {
            a = randInt(2, 12);
            b = randInt(2, 12);
            answer = a * b;
        }

        currentMathAnswer = answer;
        return `${a} ${op} ${b}`;
    }

    function randInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function initZones(w, h) {
        const padding = 40;
        zones = [
            {
                type: 'circle',
                color: '#22c55e',
                key: 'g',
                x: w * 0.25,
                y: h * 0.3,
                radius: 50,
            },
            {
                type: 'triangle',
                color: '#eab308',
                key: 'y',
                x: w * 0.7,
                y: h * 0.25,
                size: 55,
            },
            {
                type: 'rect',
                color: '#ef4444',
                key: 'r',
                x: w * 0.5 - 40,
                y: h * 0.65,
                width: 80,
                height: 50,
            },
        ];
    }

    function spawnAircraft(w, h) {
        const side = Math.floor(Math.random() * 4);
        let x, y, vx, vy;
        const spd = (0.5 + Math.random() * 1.5) * speed;

        switch (side) {
            case 0: x = -10; y = randInt(20, h - 20); vx = spd; vy = (Math.random() - 0.5) * spd; break;
            case 1: x = w + 10; y = randInt(20, h - 20); vx = -spd; vy = (Math.random() - 0.5) * spd; break;
            case 2: x = randInt(20, w - 20); y = -10; vx = (Math.random() - 0.5) * spd; vy = spd; break;
            default: x = randInt(20, w - 20); y = h + 10; vx = (Math.random() - 0.5) * spd; vy = -spd; break;
        }

        aircraft.push({ x, y, vx, vy, inZone: null, alertedZone: null });
    }

    function isInZone(ax, ay, zone) {
        if (zone.type === 'circle') {
            const dx = ax - zone.x;
            const dy = ay - zone.y;
            return dx * dx + dy * dy <= zone.radius * zone.radius;
        } else if (zone.type === 'rect') {
            return ax >= zone.x && ax <= zone.x + zone.width &&
                   ay >= zone.y && ay <= zone.y + zone.height;
        } else if (zone.type === 'triangle') {
            // Simple triangle check using barycentric coordinates
            const cx = zone.x;
            const cy = zone.y - zone.size * 0.6;
            const lx = zone.x - zone.size * 0.6;
            const ly = zone.y + zone.size * 0.4;
            const rx = zone.x + zone.size * 0.6;
            const ry = zone.y + zone.size * 0.4;
            return pointInTriangle(ax, ay, cx, cy, lx, ly, rx, ry);
        }
        return false;
    }

    function pointInTriangle(px, py, x1, y1, x2, y2, x3, y3) {
        const d1 = sign(px, py, x1, y1, x2, y2);
        const d2 = sign(px, py, x2, y2, x3, y3);
        const d3 = sign(px, py, x3, y3, x1, y1);
        const hasNeg = (d1 < 0) || (d2 < 0) || (d3 < 0);
        const hasPos = (d1 > 0) || (d2 > 0) || (d3 > 0);
        return !(hasNeg && hasPos);
    }

    function sign(px, py, x1, y1, x2, y2) {
        return (px - x2) * (y1 - y2) - (x1 - x2) * (py - y2);
    }

    function drawRadar(timestamp) {
        if (!canvasCtx || destroyed) return;
        const dt = Math.min((timestamp - lastTime) / 16, 3); // normalize to ~60fps
        lastTime = timestamp;

        const w = canvas.width;
        const h = canvas.height;

        canvasCtx.clearRect(0, 0, w, h);
        canvasCtx.fillStyle = '#0a1520';
        canvasCtx.fillRect(0, 0, w, h);

        // Draw grid lines
        canvasCtx.strokeStyle = 'rgba(42,58,85,0.5)';
        canvasCtx.lineWidth = 1;
        for (let x = 0; x < w; x += 40) {
            canvasCtx.beginPath();
            canvasCtx.moveTo(x, 0);
            canvasCtx.lineTo(x, h);
            canvasCtx.stroke();
        }
        for (let y = 0; y < h; y += 40) {
            canvasCtx.beginPath();
            canvasCtx.moveTo(0, y);
            canvasCtx.lineTo(w, y);
            canvasCtx.stroke();
        }

        // Draw zones
        zones.forEach(zone => {
            canvasCtx.globalAlpha = 0.2;
            canvasCtx.fillStyle = zone.color;
            canvasCtx.strokeStyle = zone.color;
            canvasCtx.lineWidth = 2;

            if (zone.type === 'circle') {
                canvasCtx.beginPath();
                canvasCtx.arc(zone.x, zone.y, zone.radius, 0, Math.PI * 2);
                canvasCtx.fill();
                canvasCtx.globalAlpha = 0.6;
                canvasCtx.stroke();
            } else if (zone.type === 'rect') {
                canvasCtx.fillRect(zone.x, zone.y, zone.width, zone.height);
                canvasCtx.globalAlpha = 0.6;
                canvasCtx.strokeRect(zone.x, zone.y, zone.width, zone.height);
            } else if (zone.type === 'triangle') {
                canvasCtx.beginPath();
                canvasCtx.moveTo(zone.x, zone.y - zone.size * 0.6);
                canvasCtx.lineTo(zone.x - zone.size * 0.6, zone.y + zone.size * 0.4);
                canvasCtx.lineTo(zone.x + zone.size * 0.6, zone.y + zone.size * 0.4);
                canvasCtx.closePath();
                canvasCtx.fill();
                canvasCtx.globalAlpha = 0.6;
                canvasCtx.stroke();
            }
            canvasCtx.globalAlpha = 1;
        });

        // Update and draw aircraft
        aircraft.forEach(ac => {
            ac.x += ac.vx * dt;
            ac.y += ac.vy * dt;

            // Check zones
            let currentZone = null;
            for (const zone of zones) {
                if (isInZone(ac.x, ac.y, zone)) {
                    currentZone = zone.key;
                    break;
                }
            }

            // Alert when entering a zone (only once per zone visit)
            if (currentZone && currentZone !== ac.alertedZone) {
                ac.alertedZone = currentZone;
                activeZoneAlerts.push({ key: currentZone, time: Date.now() });
            }
            if (!currentZone) {
                ac.alertedZone = null;
            }
            ac.inZone = currentZone;

            // Draw aircraft as a small triangle
            canvasCtx.fillStyle = ac.inZone ? '#fff' : '#60a5fa';
            canvasCtx.save();
            canvasCtx.translate(ac.x, ac.y);
            const angle = Math.atan2(ac.vy, ac.vx);
            canvasCtx.rotate(angle);
            canvasCtx.beginPath();
            canvasCtx.moveTo(8, 0);
            canvasCtx.lineTo(-5, -5);
            canvasCtx.lineTo(-5, 5);
            canvasCtx.closePath();
            canvasCtx.fill();
            canvasCtx.restore();
        });

        // Remove off-screen aircraft
        aircraft = aircraft.filter(ac =>
            ac.x > -30 && ac.x < w + 30 && ac.y > -30 && ac.y < h + 30
        );

        // Expire old alerts (3 second window to respond)
        const now = Date.now();
        activeZoneAlerts = activeZoneAlerts.filter(a => {
            if (now - a.time > 3000) {
                zoneMissed++;
                return false;
            }
            return true;
        });

        animFrame = requestAnimationFrame(drawRadar);
    }

    function handleZoneKey(key) {
        const alertIdx = activeZoneAlerts.findIndex(a => a.key === key);
        if (alertIdx >= 0) {
            activeZoneAlerts.splice(alertIdx, 1);
            zoneCorrect++;
            flashZoneBtn(key, true);
        } else {
            zoneFalse++;
            flashZoneBtn(key, false);
        }
    }

    function flashZoneBtn(key, isCorrect) {
        const btn = document.querySelector(`.flag-zone-btn[data-key="${key}"]`);
        if (!btn) return;
        btn.classList.add(isCorrect ? 'flash-correct' : 'flash-wrong');
        setTimeout(() => {
            btn.classList.remove('flash-correct', 'flash-wrong');
        }, 300);
    }

    function submitMathAnswer() {
        if (mathInputValue === '' || destroyed) return;
        const userAnswer = parseInt(mathInputValue, 10);
        mathTotal++;
        if (userAnswer === currentMathAnswer) mathCorrect++;

        mathInputValue = '';
        updateMathDisplay();
        newMathProblem();
    }

    function newMathProblem() {
        const text = generateMathProblem();
        if (mathProblemEl) mathProblemEl.textContent = text;
    }

    function updateMathDisplay() {
        if (mathInputEl) mathInputEl.textContent = mathInputValue || '_';
    }

    function onKeyDown(e) {
        if (destroyed) return;

        // Zone keys
        if (e.key === 'g' || e.key === 'G') { handleZoneKey('g'); return; }
        if (e.key === 'y' || e.key === 'Y') { handleZoneKey('y'); return; }
        if (e.key === 'r' || e.key === 'R') { handleZoneKey('r'); return; }

        // Math input
        if (e.key >= '0' && e.key <= '9') {
            mathInputValue += e.key;
            updateMathDisplay();
        } else if (e.key === 'Backspace') {
            mathInputValue = mathInputValue.slice(0, -1);
            updateMathDisplay();
        } else if (e.key === 'Enter') {
            submitMathAnswer();
        } else if (e.key === '-' && mathInputValue === '') {
            mathInputValue = '-';
            updateMathDisplay();
        }
    }

    return {
        start() {
            ctx.container.innerHTML = `
                <div class="flag-container">
                    <div class="flag-maths">
                        <p class="text-muted mb-2">Solve (Enter to submit)</p>
                        <div class="flag-maths-problem" id="flag-math-problem">...</div>
                        <div class="flag-maths-problem" id="flag-math-input" style="font-size:2rem;color:var(--accent-yellow);min-height:40px">_</div>
                        <div class="flag-keypad" id="flag-keypad"></div>
                        <p class="text-muted mt-2" style="font-size:0.75rem">Maths: ${mathCorrect}/${mathTotal} | Zones: ${zoneCorrect}</p>
                    </div>
                    <div class="flag-radar">
                        <canvas id="flag-canvas"></canvas>
                    </div>
                </div>
                <div class="flag-zone-buttons" style="justify-content:center;margin-top:8px">
                    <button class="flag-zone-btn green" data-key="g">G - Green</button>
                    <button class="flag-zone-btn yellow" data-key="y">Y - Yellow</button>
                    <button class="flag-zone-btn red" data-key="r">R - Red</button>
                </div>
                <p class="text-muted mt-2" style="font-size:0.8rem;text-align:center">
                    Number keys + Enter for maths | G/Y/R when aircraft enters a zone
                </p>
            `;

            mathProblemEl = document.getElementById('flag-math-problem');
            mathInputEl = document.getElementById('flag-math-input');

            // Setup keypad
            const keypad = document.getElementById('flag-keypad');
            for (let i = 1; i <= 9; i++) {
                const btn = document.createElement('button');
                btn.className = 'flag-key';
                btn.textContent = i;
                btn.addEventListener('click', () => { mathInputValue += String(i); updateMathDisplay(); });
                keypad.appendChild(btn);
            }
            // Bottom row: clear, 0, submit
            const clearBtn = document.createElement('button');
            clearBtn.className = 'flag-key';
            clearBtn.textContent = 'C';
            clearBtn.addEventListener('click', () => { mathInputValue = ''; updateMathDisplay(); });
            keypad.appendChild(clearBtn);

            const zeroBtn = document.createElement('button');
            zeroBtn.className = 'flag-key';
            zeroBtn.textContent = '0';
            zeroBtn.addEventListener('click', () => { mathInputValue += '0'; updateMathDisplay(); });
            keypad.appendChild(zeroBtn);

            const enterBtn = document.createElement('button');
            enterBtn.className = 'flag-key';
            enterBtn.textContent = '↵';
            enterBtn.addEventListener('click', submitMathAnswer);
            keypad.appendChild(enterBtn);

            // Zone buttons click handlers
            document.querySelectorAll('.flag-zone-btn').forEach(btn => {
                btn.addEventListener('click', () => handleZoneKey(btn.dataset.key));
            });

            // Canvas setup
            canvas = document.getElementById('flag-canvas');
            const radarDiv = canvas.parentElement;
            canvas.width = radarDiv.clientWidth;
            canvas.height = radarDiv.clientHeight;
            canvasCtx = canvas.getContext('2d');

            initZones(canvas.width, canvas.height);

            // Keyboard handler
            document.addEventListener('keydown', onKeyDown);

            // Start animation
            lastTime = performance.now();
            animFrame = requestAnimationFrame(drawRadar);

            // Spawn aircraft periodically
            const spawnInterval = setInterval(() => {
                if (destroyed) { clearInterval(spawnInterval); return; }
                spawnAircraft(canvas.width, canvas.height);
                // Increase speed over time
                speed = Math.min(3, 1 + mathTotal * 0.05);
            }, 2500);

            // Spawn initial aircraft
            for (let i = 0; i < 3; i++) {
                spawnAircraft(canvas.width, canvas.height);
            }

            newMathProblem();

            // Status update interval
            const statusInterval = setInterval(() => {
                if (destroyed) { clearInterval(statusInterval); return; }
                const statsEl = ctx.container.querySelector('.flag-maths .text-muted:last-child');
                if (statsEl) {
                    statsEl.textContent = `Maths: ${mathCorrect}/${mathTotal} | Zones: ${zoneCorrect} (missed: ${zoneMissed})`;
                }
            }, 500);

            ctx.startTimer(300); // 5 min
        },

        onTimeUp() {
            if (destroyed) return;
            destroyed = true;
            document.removeEventListener('keydown', onKeyDown);
            if (animFrame) cancelAnimationFrame(animFrame);

            // Combined scoring
            const mathPct = mathTotal > 0 ? (mathCorrect / mathTotal) * 100 : 0;
            const totalZoneEvents = zoneCorrect + zoneMissed;
            const zonePct = totalZoneEvents > 0 ? (zoneCorrect / totalZoneEvents) * 100 : 50;

            // Weighted combined score (60% maths throughput, 40% zone tracking)
            const mathThroughput = Math.min(100, mathCorrect * 2.5); // ~40 correct = 100%
            const combined = mathThroughput * 0.6 + zonePct * 0.4;

            let percentile;
            if (combined < 15) percentile = 2;
            else if (combined < 25) percentile = 7;
            else if (combined < 35) percentile = 17;
            else if (combined < 45) percentile = 31;
            else if (combined < 55) percentile = 50;
            else if (combined < 67) percentile = 68;
            else if (combined < 78) percentile = 83;
            else if (combined < 90) percentile = 92;
            else percentile = 98;

            ctx.onComplete({
                correct: mathCorrect + zoneCorrect,
                total: mathTotal + zoneCorrect + zoneMissed + zoneFalse,
                stanine: percentileToStanine(percentile),
                details: `Maths: ${mathCorrect}/${mathTotal} correct (${Math.round(mathPct)}%). Zone alerts: ${zoneCorrect} correct, ${zoneMissed} missed, ${zoneFalse} false alarms.`,
            });
        },

        destroy() {
            destroyed = true;
            document.removeEventListener('keydown', onKeyDown);
            if (animFrame) cancelAnimationFrame(animFrame);
        },
    };
}
