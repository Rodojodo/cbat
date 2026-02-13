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
            <li>Select the 3D aircraft view that matches both instruments.</li>
            <li>Use process of elimination — check heading first, then pitch/bank.</li>
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

// Camera: looking from above-front-right, giving a 3/4 view
const CAM_ELEV = 30 * DEG;   // look down 30°
const CAM_AZI  = 18 * DEG;   // slightly from right

function projectPoint(p) {
    let q = rotateY(p, -CAM_AZI);
    q = rotateX(q, CAM_ELEV);
    // orthographic projection — x,y become screen coords, z is depth
    return { x: q.x, y: -q.y, depth: q.z };
}

function transformFace(verts, headingDeg, pitchDeg, bankDeg) {
    const h = headingDeg * DEG;
    const p = pitchDeg * DEG;
    const b = bankDeg * DEG;
    return verts.map(v => {
        // apply bank (roll around forward axis Z)
        let q = rotateZ(v, b);
        // apply pitch (around lateral axis X)
        q = rotateX(q, -p);
        // apply heading (around vertical axis Y)
        q = rotateY(q, h);
        return q;
    });
}

function faceNormal(v0, v1, v2) {
    const ax = v1.x - v0.x, ay = v1.y - v0.y, az = v1.z - v0.z;
    const bx = v2.x - v0.x, by = v2.y - v0.y, bz = v2.z - v0.z;
    return { x: ay * bz - az * by, y: az * bx - ax * bz, z: ax * by - ay * bx };
}

function faceCentroidDepth(projected) {
    return projected.reduce((s, p) => s + p.depth, 0) / projected.length;
}

// ---- Aircraft model (local coords: nose = +Z, up = +Y, right = +X) ----
// Units are arbitrary, scaled to fit canvas at draw time

function getAircraftFaces() {
    // Returns array of { verts: [{x,y,z}...], colorTop, colorBot }
    // colorTop = color when face normal points "up" (toward camera), colorBot = underside
    const S = 1; // scale
    return [
        // ---- Fuselage top ----
        {
            verts: [
                {x:0, y:0.25*S, z:3.8*S},       // nose tip
                {x:0.5*S, y:0.3*S, z:1.5*S},
                {x:0.55*S, y:0.3*S, z:-0.5*S},
                {x:0.4*S, y:0.25*S, z:-3.2*S},
                {x:-0.4*S, y:0.25*S, z:-3.2*S},
                {x:-0.55*S, y:0.3*S, z:-0.5*S},
                {x:-0.5*S, y:0.3*S, z:1.5*S},
            ],
            colorTop: '#6b7b94', colorBot: '#2a3448',
        },
        // ---- Fuselage bottom ----
        {
            verts: [
                {x:0, y:-0.1*S, z:3.8*S},
                {x:-0.5*S, y:-0.15*S, z:1.5*S},
                {x:-0.55*S, y:-0.15*S, z:-0.5*S},
                {x:-0.4*S, y:-0.1*S, z:-3.2*S},
                {x:0.4*S, y:-0.1*S, z:-3.2*S},
                {x:0.55*S, y:-0.15*S, z:-0.5*S},
                {x:0.5*S, y:-0.15*S, z:1.5*S},
            ],
            colorTop: '#2a3448', colorBot: '#4a5a74',
        },
        // ---- Fuselage right side ----
        {
            verts: [
                {x:0.5*S, y:0.3*S, z:1.5*S},
                {x:0.5*S, y:-0.15*S, z:1.5*S},
                {x:0.55*S, y:-0.15*S, z:-0.5*S},
                {x:0.55*S, y:0.3*S, z:-0.5*S},
            ],
            colorTop: '#5a6a82', colorBot: '#3a4a62',
        },
        // ---- Fuselage left side ----
        {
            verts: [
                {x:-0.5*S, y:0.3*S, z:1.5*S},
                {x:-0.55*S, y:0.3*S, z:-0.5*S},
                {x:-0.55*S, y:-0.15*S, z:-0.5*S},
                {x:-0.5*S, y:-0.15*S, z:1.5*S},
            ],
            colorTop: '#5a6a82', colorBot: '#3a4a62',
        },
        // ---- Cockpit (canopy) ----
        {
            verts: [
                {x:0, y:0.55*S, z:2.4*S},
                {x:0.3*S, y:0.35*S, z:1.8*S},
                {x:0.3*S, y:0.35*S, z:0.8*S},
                {x:-0.3*S, y:0.35*S, z:0.8*S},
                {x:-0.3*S, y:0.35*S, z:1.8*S},
            ],
            colorTop: '#38bdf8', colorBot: '#1a4060',
        },
        // ---- Right wing top ----
        {
            verts: [
                {x:0.6*S, y:0.1*S, z:0.2*S},
                {x:4.2*S, y:0.02*S, z:-0.6*S},
                {x:4.0*S, y:0.02*S, z:-1.3*S},
                {x:0.6*S, y:0.1*S, z:-1.6*S},
            ],
            colorTop: '#7a8aa2', colorBot: '#2a3a52',
        },
        // ---- Right wing bottom ----
        {
            verts: [
                {x:0.6*S, y:-0.05*S, z:0.2*S},
                {x:0.6*S, y:-0.05*S, z:-1.6*S},
                {x:4.0*S, y:-0.08*S, z:-1.3*S},
                {x:4.2*S, y:-0.08*S, z:-0.6*S},
            ],
            colorTop: '#2a3a52', colorBot: '#7a8aa2',
        },
        // ---- Left wing top ----
        {
            verts: [
                {x:-0.6*S, y:0.1*S, z:0.2*S},
                {x:-0.6*S, y:0.1*S, z:-1.6*S},
                {x:-4.0*S, y:0.02*S, z:-1.3*S},
                {x:-4.2*S, y:0.02*S, z:-0.6*S},
            ],
            colorTop: '#7a8aa2', colorBot: '#2a3a52',
        },
        // ---- Left wing bottom ----
        {
            verts: [
                {x:-0.6*S, y:-0.05*S, z:0.2*S},
                {x:-4.2*S, y:-0.08*S, z:-0.6*S},
                {x:-4.0*S, y:-0.08*S, z:-1.3*S},
                {x:-0.6*S, y:-0.05*S, z:-1.6*S},
            ],
            colorTop: '#2a3a52', colorBot: '#7a8aa2',
        },
        // ---- Tail fin (vertical stabilizer) ----
        {
            verts: [
                {x:0, y:0.3*S, z:-2.0*S},
                {x:0, y:2.0*S, z:-3.4*S},
                {x:0, y:0.3*S, z:-3.4*S},
            ],
            colorTop: '#8899b3', colorBot: '#4a5a72',
        },
        // ---- Tail fin right face ----
        {
            verts: [
                {x:0.04*S, y:0.3*S, z:-2.0*S},
                {x:0.04*S, y:2.0*S, z:-3.4*S},
                {x:0.04*S, y:0.3*S, z:-3.4*S},
            ],
            colorTop: '#6a7a92', colorBot: '#4a5a72',
        },
        // ---- Tail fin left face ----
        {
            verts: [
                {x:-0.04*S, y:0.3*S, z:-2.0*S},
                {x:-0.04*S, y:0.3*S, z:-3.4*S},
                {x:-0.04*S, y:2.0*S, z:-3.4*S},
            ],
            colorTop: '#5a6a82', colorBot: '#4a5a72',
        },
        // ---- Right horizontal stabilizer top ----
        {
            verts: [
                {x:0.3*S, y:0.2*S, z:-2.4*S},
                {x:1.8*S, y:0.15*S, z:-3.0*S},
                {x:1.6*S, y:0.15*S, z:-3.4*S},
                {x:0.3*S, y:0.2*S, z:-3.2*S},
            ],
            colorTop: '#7a8aa2', colorBot: '#2a3a52',
        },
        // ---- Left horizontal stabilizer top ----
        {
            verts: [
                {x:-0.3*S, y:0.2*S, z:-2.4*S},
                {x:-0.3*S, y:0.2*S, z:-3.2*S},
                {x:-1.6*S, y:0.15*S, z:-3.4*S},
                {x:-1.8*S, y:0.15*S, z:-3.0*S},
            ],
            colorTop: '#7a8aa2', colorBot: '#2a3a52',
        },
        // ---- Nose cone ----
        {
            verts: [
                {x:0, y:0.25*S, z:3.8*S},
                {x:0.2*S, y:0.1*S, z:3.2*S},
                {x:0, y:-0.1*S, z:3.8*S},
                {x:-0.2*S, y:0.1*S, z:3.2*S},
            ],
            colorTop: '#ef4444', colorBot: '#b91c1c',
        },
        // ---- Engine nozzle (rear) ----
        {
            verts: [
                {x:0.35*S, y:0.2*S, z:-3.2*S},
                {x:0.35*S, y:-0.05*S, z:-3.2*S},
                {x:-0.35*S, y:-0.05*S, z:-3.2*S},
                {x:-0.35*S, y:0.2*S, z:-3.2*S},
            ],
            colorTop: '#1a1a2e', colorBot: '#1a1a2e',
        },
    ];
}

// ---- Drawing functions ----

function drawAircraftOption(canvas, headingDeg, bankDeg, pitchDeg) {
    const c = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;

    c.clearRect(0, 0, w, h);

    // ---- Background: sky/ground split showing aircraft attitude ----
    // The horizon line tilts with bank and shifts with pitch
    c.save();
    c.translate(cx, cy);

    // Horizon offset for pitch (positive pitch = nose up = horizon moves down)
    const horizonShift = (pitchDeg / 90) * h * 0.6;
    // Bank tilts the horizon
    const bankRad = bankDeg * DEG;

    c.rotate(-bankRad);
    c.translate(0, horizonShift);

    // Sky
    c.fillStyle = '#1a4a7a';
    c.fillRect(-w, -h * 2, w * 2, h * 2);
    // Ground
    c.fillStyle = '#5a4a20';
    c.fillRect(-w, 0, w * 2, h * 2);
    // Horizon line
    c.strokeStyle = 'rgba(255,255,255,0.25)';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(-w, 0);
    c.lineTo(w, 0);
    c.stroke();

    c.restore();

    // ---- Render the 3D aircraft ----
    const faces = getAircraftFaces();
    const rendered = [];

    for (const face of faces) {
        // Transform vertices by heading, pitch, bank
        const worldVerts = transformFace(face.verts, headingDeg, pitchDeg, bankDeg);

        // Project to 2D
        const projected = worldVerts.map(v => projectPoint(v));

        // Compute face normal to determine front/back facing
        if (worldVerts.length >= 3) {
            const normal = faceNormal(worldVerts[0], worldVerts[1], worldVerts[2]);
            // Camera direction (simplified: mostly looking along -Z after camera rotation)
            const camDir = { x: Math.sin(CAM_AZI), y: -Math.sin(CAM_ELEV), z: -Math.cos(CAM_ELEV) * Math.cos(CAM_AZI) };
            const dot = normal.x * camDir.x + normal.y * camDir.y + normal.z * camDir.z;

            // Choose color based on which side faces camera
            const color = dot > 0 ? face.colorTop : face.colorBot;

            const avgDepth = faceCentroidDepth(projected);

            rendered.push({ projected, color, depth: avgDepth });
        }
    }

    // Painter's algorithm: draw far faces first
    rendered.sort((a, b) => a.depth - b.depth);

    // Scale to fit canvas
    const scale = Math.min(w, h) * 0.11;

    for (const face of rendered) {
        c.fillStyle = face.color;
        c.strokeStyle = 'rgba(0,0,0,0.3)';
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

    // ---- Subtle compass arrow in corner showing heading ----
    const arrowSize = 12;
    const arrowX = w - 16;
    const arrowY = 16;
    c.save();
    c.translate(arrowX, arrowY);
    c.rotate(headingDeg * DEG);
    c.fillStyle = 'rgba(255,255,255,0.4)';
    c.beginPath();
    c.moveTo(0, -arrowSize);
    c.lineTo(arrowSize * 0.4, arrowSize * 0.4);
    c.lineTo(0, arrowSize * 0.15);
    c.lineTo(-arrowSize * 0.4, arrowSize * 0.4);
    c.closePath();
    c.fill();
    // N label
    c.fillStyle = 'rgba(255,255,255,0.3)';
    c.font = '7px sans-serif';
    c.textAlign = 'center';
    c.fillText('N', 0, -arrowSize - 3);
    c.restore();
}


// ---- Instrument drawing (these are fine as-is, just rendering real gauges) ----

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

        // Generate 3 wrong answers — each differs in exactly 1 or 2 attributes
        // to make it a genuine visual discrimination task
        const options = [correctAnswer];
        const attempts = 0;
        while (options.length < 4) {
            // Decide how many attributes to change (1 or 2)
            const changeCnt = options.length <= 2 ? 1 : Math.random() < 0.5 ? 1 : 2;
            const attrs = ['heading', 'bank', 'pitch'];
            // Shuffle and pick changeCnt attributes to alter
            const shuffled = attrs.sort(() => Math.random() - 0.5);
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

            // Check it actually differs and isn't a duplicate
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
            <div class="insc-options" id="insc-options"></div>
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
            drawAircraftOption(optCanvas, optHeadingDeg, opt.bank, opt.pitch);

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
