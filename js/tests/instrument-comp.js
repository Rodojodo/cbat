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
            <li><strong>North is directly through the screen</strong> (away from you). An aircraft heading North flies away; heading South flies toward you; heading East flies to the right.</li>
            <li>Select the aircraft view (1–5) that matches both instruments.</li>
            <li>You have <strong>5 minutes</strong>.</li>
        </ul>
    `;
}

// ---- 3D math helpers ----

function rotateX(p, a) {
    const c = Math.cos(a), s = Math.sin(a);
    return { x: p.x, y: p.y * c - p.z * s, z: p.y * s + p.z * c };
}
function rotateY(p, a) {
    const c = Math.cos(a), s = Math.sin(a);
    return { x: p.x * c + p.z * s, y: p.y, z: -p.x * s + p.z * c };
}
function rotateZ(p, a) {
    const c = Math.cos(a), s = Math.sin(a);
    return { x: p.x * c - p.y * s, y: p.x * s + p.y * c, z: p.z };
}

const DEG = Math.PI / 180;

// Camera: fixed looking North (into screen +Z), slightly elevated
const CAM_ELEV = 15 * DEG;

function projectPoint(p) {
    // Camera looks along +Z, slightly from above
    let q = rotateX(p, CAM_ELEV);
    return { x: q.x, y: -q.y, depth: q.z };
}

function transformFace(verts, headingDeg, pitchDeg, bankDeg) {
    const h = headingDeg * DEG;
    const p = pitchDeg * DEG;
    const b = bankDeg * DEG;
    return verts.map(v => {
        let q = rotateZ(v, b);    // bank (roll)
        q = rotateX(q, -p);       // pitch
        q = rotateY(q, h);        // heading (yaw)
        return q;
    });
}

function faceNormal(v0, v1, v2) {
    const ax = v1.x - v0.x, ay = v1.y - v0.y, az = v1.z - v0.z;
    const bx = v2.x - v0.x, by = v2.y - v0.y, bz = v2.z - v0.z;
    return { x: ay * bz - az * by, y: az * bx - ax * bz, z: ax * by - ay * bx };
}

function vecLen(v) {
    return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

function faceCentroidDepth(projected) {
    return projected.reduce((s, p) => s + p.depth, 0) / projected.length;
}

// Light direction: from above and slightly in front-left
const LIGHT = (() => {
    const l = { x: -0.2, y: 0.85, z: 0.5 };
    const len = vecLen(l);
    return { x: l.x / len, y: l.y / len, z: l.z / len };
})();

// Compute a red shade from face normal + light direction
function computeRedShade(normal) {
    const len = vecLen(normal);
    if (len < 0.001) return 'rgb(140,20,20)';
    const nx = normal.x / len, ny = normal.y / len, nz = normal.z / len;
    const dot = nx * LIGHT.x + ny * LIGHT.y + nz * LIGHT.z;
    // Brightness range: 0.25 (deep shadow) to 1.0 (full light)
    const brightness = 0.25 + Math.max(0, dot) * 0.75;
    const r = Math.round(210 * brightness);
    const g = Math.round(32 * brightness);
    const b = Math.round(32 * brightness);
    return `rgb(${r},${g},${b})`;
}

function computeCanopyShade(normal) {
    const len = vecLen(normal);
    if (len < 0.001) return 'rgb(20,60,90)';
    const nx = normal.x / len, ny = normal.y / len, nz = normal.z / len;
    const dot = nx * LIGHT.x + ny * LIGHT.y + nz * LIGHT.z;
    const brightness = 0.3 + Math.max(0, dot) * 0.7;
    const r = Math.round(40 * brightness);
    const g = Math.round(140 * brightness);
    const b = Math.round(220 * brightness);
    return `rgb(${r},${g},${b})`;
}

function computeNozzleShade() {
    return '#1a1a2e';
}

// ---- Aircraft model (local coords: nose = +Z, up = +Y, right = +X) ----

function getAircraftFaces() {
    const S = 1;
    return [
        // Fuselage top
        { verts: [
            {x:0, y:0.25*S, z:3.8*S},
            {x:0.5*S, y:0.3*S, z:1.5*S},
            {x:0.55*S, y:0.3*S, z:-0.5*S},
            {x:0.4*S, y:0.25*S, z:-3.2*S},
            {x:-0.4*S, y:0.25*S, z:-3.2*S},
            {x:-0.55*S, y:0.3*S, z:-0.5*S},
            {x:-0.5*S, y:0.3*S, z:1.5*S},
        ], part: 'body' },
        // Fuselage bottom
        { verts: [
            {x:0, y:-0.1*S, z:3.8*S},
            {x:-0.5*S, y:-0.15*S, z:1.5*S},
            {x:-0.55*S, y:-0.15*S, z:-0.5*S},
            {x:-0.4*S, y:-0.1*S, z:-3.2*S},
            {x:0.4*S, y:-0.1*S, z:-3.2*S},
            {x:0.55*S, y:-0.15*S, z:-0.5*S},
            {x:0.5*S, y:-0.15*S, z:1.5*S},
        ], part: 'body' },
        // Fuselage right side
        { verts: [
            {x:0.5*S, y:0.3*S, z:1.5*S},
            {x:0.5*S, y:-0.15*S, z:1.5*S},
            {x:0.55*S, y:-0.15*S, z:-0.5*S},
            {x:0.55*S, y:0.3*S, z:-0.5*S},
        ], part: 'body' },
        // Fuselage left side
        { verts: [
            {x:-0.5*S, y:0.3*S, z:1.5*S},
            {x:-0.55*S, y:0.3*S, z:-0.5*S},
            {x:-0.55*S, y:-0.15*S, z:-0.5*S},
            {x:-0.5*S, y:-0.15*S, z:1.5*S},
        ], part: 'body' },
        // Cockpit (canopy)
        { verts: [
            {x:0, y:0.55*S, z:2.4*S},
            {x:0.3*S, y:0.35*S, z:1.8*S},
            {x:0.3*S, y:0.35*S, z:0.8*S},
            {x:-0.3*S, y:0.35*S, z:0.8*S},
            {x:-0.3*S, y:0.35*S, z:1.8*S},
        ], part: 'canopy' },
        // Right wing top
        { verts: [
            {x:0.6*S, y:0.1*S, z:0.2*S},
            {x:4.2*S, y:0.02*S, z:-0.6*S},
            {x:4.0*S, y:0.02*S, z:-1.3*S},
            {x:0.6*S, y:0.1*S, z:-1.6*S},
        ], part: 'body' },
        // Right wing bottom
        { verts: [
            {x:0.6*S, y:-0.05*S, z:0.2*S},
            {x:0.6*S, y:-0.05*S, z:-1.6*S},
            {x:4.0*S, y:-0.08*S, z:-1.3*S},
            {x:4.2*S, y:-0.08*S, z:-0.6*S},
        ], part: 'body' },
        // Left wing top
        { verts: [
            {x:-0.6*S, y:0.1*S, z:0.2*S},
            {x:-0.6*S, y:0.1*S, z:-1.6*S},
            {x:-4.0*S, y:0.02*S, z:-1.3*S},
            {x:-4.2*S, y:0.02*S, z:-0.6*S},
        ], part: 'body' },
        // Left wing bottom
        { verts: [
            {x:-0.6*S, y:-0.05*S, z:0.2*S},
            {x:-4.2*S, y:-0.08*S, z:-0.6*S},
            {x:-4.0*S, y:-0.08*S, z:-1.3*S},
            {x:-0.6*S, y:-0.05*S, z:-1.6*S},
        ], part: 'body' },
        // Tail fin right
        { verts: [
            {x:0.04*S, y:0.3*S, z:-2.0*S},
            {x:0.04*S, y:2.0*S, z:-3.4*S},
            {x:0.04*S, y:0.3*S, z:-3.4*S},
        ], part: 'body' },
        // Tail fin left
        { verts: [
            {x:-0.04*S, y:0.3*S, z:-2.0*S},
            {x:-0.04*S, y:0.3*S, z:-3.4*S},
            {x:-0.04*S, y:2.0*S, z:-3.4*S},
        ], part: 'body' },
        // Right horizontal stabilizer
        { verts: [
            {x:0.3*S, y:0.2*S, z:-2.4*S},
            {x:1.8*S, y:0.15*S, z:-3.0*S},
            {x:1.6*S, y:0.15*S, z:-3.4*S},
            {x:0.3*S, y:0.2*S, z:-3.2*S},
        ], part: 'body' },
        // Left horizontal stabilizer
        { verts: [
            {x:-0.3*S, y:0.2*S, z:-2.4*S},
            {x:-0.3*S, y:0.2*S, z:-3.2*S},
            {x:-1.6*S, y:0.15*S, z:-3.4*S},
            {x:-1.8*S, y:0.15*S, z:-3.0*S},
        ], part: 'body' },
        // Nose cone
        { verts: [
            {x:0, y:0.25*S, z:3.8*S},
            {x:0.2*S, y:0.1*S, z:3.2*S},
            {x:0, y:-0.1*S, z:3.8*S},
            {x:-0.2*S, y:0.1*S, z:3.2*S},
        ], part: 'body' },
        // Engine nozzle
        { verts: [
            {x:0.35*S, y:0.2*S, z:-3.2*S},
            {x:0.35*S, y:-0.05*S, z:-3.2*S},
            {x:-0.35*S, y:-0.05*S, z:-3.2*S},
            {x:-0.35*S, y:0.2*S, z:-3.2*S},
        ], part: 'nozzle' },
    ];
}


// ---- Drawing functions ----

function drawAircraftOption(canvas, headingDeg, bankDeg, pitchDeg, optionNum) {
    const c = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;

    c.clearRect(0, 0, w, h);

    // Grey gradient "tunnel" background
    const grad = c.createRadialGradient(cx, cy, 0, cx, cy, w * 0.7);
    grad.addColorStop(0, '#9aa0a8');
    grad.addColorStop(0.5, '#6a7078');
    grad.addColorStop(1, '#3a3e44');
    c.fillStyle = grad;
    c.fillRect(0, 0, w, h);

    // Subtle perspective depth lines converging to centre
    c.strokeStyle = 'rgba(255,255,255,0.06)';
    c.lineWidth = 1;
    const corners = [[0,0],[w,0],[w,h],[0,h]];
    for (const [ex, ey] of corners) {
        c.beginPath();
        c.moveTo(ex, ey);
        c.lineTo(cx, cy);
        c.stroke();
    }

    // ---- Render the 3D aircraft ----
    const faces = getAircraftFaces();
    const rendered = [];

    // Camera direction for backface culling
    const camDir = { x: 0, y: -Math.sin(CAM_ELEV), z: Math.cos(CAM_ELEV) };

    for (const face of faces) {
        const worldVerts = transformFace(face.verts, headingDeg, pitchDeg, bankDeg);
        const projected = worldVerts.map(v => projectPoint(v));

        if (worldVerts.length >= 3) {
            const normal = faceNormal(worldVerts[0], worldVerts[1], worldVerts[2]);

            // Determine color based on part type and lighting
            let color;
            if (face.part === 'canopy') {
                color = computeCanopyShade(normal);
            } else if (face.part === 'nozzle') {
                color = computeNozzleShade();
            } else {
                color = computeRedShade(normal);
            }

            rendered.push({
                projected,
                color,
                depth: faceCentroidDepth(projected),
            });
        }
    }

    // Painter's algorithm
    rendered.sort((a, b) => a.depth - b.depth);

    const scale = Math.min(w, h) * 0.11;

    for (const face of rendered) {
        c.fillStyle = face.color;
        c.strokeStyle = 'rgba(0,0,0,0.25)';
        c.lineWidth = 0.5;
        c.beginPath();
        face.projected.forEach((p, i) => {
            const sx = cx + p.x * scale;
            const sy = cy + p.y * scale;
            if (i === 0) c.moveTo(sx, sy);
            else c.lineTo(sx, sy);
        });
        c.closePath();
        c.fill();
        c.stroke();
    }

    // Option number label (bottom-left corner)
    if (optionNum !== undefined) {
        c.fillStyle = 'rgba(0,0,0,0.5)';
        c.fillRect(2, h - 20, 18, 18);
        c.fillStyle = '#fff';
        c.font = 'bold 13px sans-serif';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText(String(optionNum), 11, h - 11);
    }
}


// ---- Instrument drawing ----

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

    // Fixed aircraft symbol (yellow wings)
    ctx2d.strokeStyle = '#fbbf24';
    ctx2d.lineWidth = 3;
    ctx2d.beginPath();
    ctx2d.moveTo(cx - r * 0.5, cy);
    ctx2d.lineTo(cx - r * 0.15, cy);
    ctx2d.stroke();
    ctx2d.beginPath();
    ctx2d.moveTo(cx + r * 0.15, cy);
    ctx2d.lineTo(cx + r * 0.5, cy);
    ctx2d.stroke();
    ctx2d.fillStyle = '#fbbf24';
    ctx2d.beginPath();
    ctx2d.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx2d.fill();

    // Bank indicator at top
    ctx2d.save();
    ctx2d.translate(cx, cy);
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

    // Fixed red aircraft silhouette in centre (pointing up = North)
    ctx2d.fillStyle = '#d63030';
    ctx2d.beginPath();
    // Fuselage
    ctx2d.moveTo(cx, cy - r * 0.35);           // nose
    ctx2d.lineTo(cx + 3, cy - r * 0.15);
    ctx2d.lineTo(cx + 3, cy + r * 0.25);
    ctx2d.lineTo(cx - 3, cy + r * 0.25);
    ctx2d.lineTo(cx - 3, cy - r * 0.15);
    ctx2d.closePath();
    ctx2d.fill();
    // Wings
    ctx2d.beginPath();
    ctx2d.moveTo(cx - r * 0.28, cy + r * 0.05);
    ctx2d.lineTo(cx - 3, cy - r * 0.05);
    ctx2d.lineTo(cx + 3, cy - r * 0.05);
    ctx2d.lineTo(cx + r * 0.28, cy + r * 0.05);
    ctx2d.lineTo(cx + 3, cy + r * 0.08);
    ctx2d.lineTo(cx - 3, cy + r * 0.08);
    ctx2d.closePath();
    ctx2d.fill();
    // Tailplane
    ctx2d.beginPath();
    ctx2d.moveTo(cx - r * 0.15, cy + r * 0.22);
    ctx2d.lineTo(cx, cy + r * 0.15);
    ctx2d.lineTo(cx + r * 0.15, cy + r * 0.22);
    ctx2d.closePath();
    ctx2d.fill();

    // Border
    ctx2d.strokeStyle = '#5a6a82';
    ctx2d.lineWidth = 3;
    ctx2d.beginPath();
    ctx2d.arc(cx, cy, r, 0, Math.PI * 2);
    ctx2d.stroke();
}


// ---- Test logic ----

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

        // Generate 4 wrong answers — differ by 1 or 2 attributes
        const options = [correctAnswer];
        while (options.length < 5) {
            const changeCnt = options.length <= 2 ? 1 : Math.random() < 0.5 ? 1 : 2;
            const attrs = ['heading', 'bank', 'pitch'];
            const shuffled = [...attrs].sort(() => Math.random() - 0.5);
            const toChange = shuffled.slice(0, changeCnt);

            let wrongH = heading, wrongB = bank, wrongP = pitch;

            if (toChange.includes('heading')) {
                const pool = HEADINGS.filter(h => h !== heading);
                wrongH = pool[Math.floor(Math.random() * pool.length)];
            }
            if (toChange.includes('bank')) {
                const pool = BANKS.filter(b => b !== bank);
                wrongB = pool[Math.floor(Math.random() * pool.length)];
            }
            if (toChange.includes('pitch')) {
                const pool = PITCHES.filter(p => p !== pitch);
                wrongP = pool[Math.floor(Math.random() * pool.length)];
            }

            if (wrongH === heading && wrongB === bank && wrongP === pitch) continue;
            const dup = options.some(o => o.heading === wrongH && o.bank === wrongB && o.pitch === wrongP);
            if (dup) continue;

            options.push({ heading: wrongH, bank: wrongB, pitch: wrongP });
        }

        // Shuffle
        for (let i = options.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [options[i], options[j]] = [options[j], options[i]];
        }

        return { correctAnswer, options, correctIndex: options.indexOf(correctAnswer) };
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
            <p class="text-muted mb-2">Which aircraft matches these instruments? (${round + 1}/${TOTAL_ROUNDS})</p>
            <div class="insc-instruments">
                <div class="insc-instrument">
                    <canvas id="ai-canvas" width="160" height="160"></canvas>
                    <p>Attitude Indicator</p>
                </div>
                <div class="insc-instrument">
                    <canvas id="hi-canvas" width="160" height="160"></canvas>
                    <p>Heading Indicator</p>
                </div>
            </div>
            <div class="insc-options insc-options-5" id="insc-options"></div>
        `;

        drawAttitudeIndicator(document.getElementById('ai-canvas'), q.correctAnswer.pitch, q.correctAnswer.bank);
        drawHeadingIndicator(document.getElementById('hi-canvas'), headingDeg);

        const optContainer = document.getElementById('insc-options');
        q.options.forEach((opt, idx) => {
            const div = document.createElement('div');
            div.className = 'insc-option';
            div.innerHTML = `<canvas width="150" height="150"></canvas>`;
            const optCanvas = div.querySelector('canvas');
            const optHeadingDeg = HEADING_DEGS[opt.heading];
            drawAircraftOption(optCanvas, optHeadingDeg, opt.bank, opt.pitch, idx + 1);

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
