// ============================================
// Airborne Numerical Test (ANT)
// Speed/Distance/Time and fuel calculations
// ============================================

import { percentileToStanine } from '../scoring.js';

export function getInstructions() {
    return `
        <p>This test measures your ability to perform speed, distance, time and fuel calculations mentally.</p>
        <ul>
            <li>You will be given mission scenarios with reference charts showing speed/fuel data.</li>
            <li>Calculate answers using mental arithmetic only — no calculators or paper.</li>
            <li>Round numbers to make calculations easier. Close estimates can still score marks.</li>
            <li>Use the formulas: <strong>Distance = Speed × Time</strong>, <strong>Time = Distance ÷ Speed</strong>.</li>
            <li>Fuel consumption is given in litres per hour for each speed.</li>
            <li>You have approximately <strong>1 minute per question</strong>, <strong>8 minutes</strong> total.</li>
        </ul>
    `;
}

// Reference data for scenarios
const SPEED_FUEL_TABLE = [
    { speed: 100, fuel: 40 },
    { speed: 150, fuel: 55 },
    { speed: 200, fuel: 75 },
    { speed: 250, fuel: 100 },
    { speed: 300, fuel: 130 },
    { speed: 350, fuel: 165 },
    { speed: 400, fuel: 210 },
];

const CARGO_TABLE = [
    { cargo: 0, maxSpeed: 400 },
    { cargo: 500, maxSpeed: 350 },
    { cargo: 1000, maxSpeed: 300 },
    { cargo: 1500, maxSpeed: 250 },
    { cargo: 2000, maxSpeed: 200 },
];

function generateQuestions() {
    const questions = [];

    // Q1: Simple time calculation
    const s1 = pickFrom([150, 200, 250, 300]);
    const d1 = pickFrom([100, 150, 200, 300, 450, 600]);
    const t1Mins = (d1 / s1) * 60;
    questions.push({
        scenario: `An aircraft departs Base Alpha at 09:00 heading to Base Bravo, ${d1} km away, flying at ${s1} km/h.`,
        question: `What time does the aircraft arrive at Base Bravo?`,
        answer: addMinutesToTime(9, 0, Math.round(t1Mins)),
        tolerance: 2, // minutes tolerance
        type: 'time',
        hint: `${d1} km ÷ ${s1} km/h = ${(d1/s1).toFixed(2)} hours`,
    });

    // Q2: Fuel calculation
    const s2 = pickFrom([200, 250, 300, 350]);
    const fuelRate = SPEED_FUEL_TABLE.find(r => r.speed === s2).fuel;
    const d2 = pickFrom([200, 300, 400, 500]);
    const flyTime2 = d2 / s2; // hours
    const fuelNeeded = Math.round(fuelRate * flyTime2);
    questions.push({
        scenario: `An aircraft must fly ${d2} km at ${s2} km/h. Refer to the fuel consumption chart.`,
        question: `How many litres of fuel are needed for this journey?`,
        answer: fuelNeeded,
        tolerance: 5,
        type: 'number',
        hint: `Time = ${d2}/${s2} = ${flyTime2.toFixed(2)}h. Fuel = ${fuelRate} L/h × ${flyTime2.toFixed(2)}h`,
    });

    // Q3: Distance from speed and time
    const s3 = pickFrom([150, 200, 250, 300]);
    const t3 = pickFrom([30, 45, 60, 90, 120]); // minutes
    const d3 = Math.round((s3 * t3) / 60);
    questions.push({
        scenario: `An aircraft flies at ${s3} km/h for ${t3} minutes.`,
        question: `How far does it travel (in km)?`,
        answer: d3,
        tolerance: 5,
        type: 'number',
        hint: `${s3} × ${t3}/60 = ${d3} km`,
    });

    // Q4: Required speed
    const d4 = pickFrom([200, 300, 400, 500, 600]);
    const depTime = pickFrom([{ h: 10, m: 0 }, { h: 14, m: 0 }, { h: 8, m: 30 }]);
    const arrTime = pickFrom([
        { h: depTime.h + 1, m: depTime.m },
        { h: depTime.h + 2, m: depTime.m },
        { h: depTime.h + 1, m: depTime.m + 30 },
    ]);
    const availableMinutes = (arrTime.h - depTime.h) * 60 + (arrTime.m - depTime.m);
    const reqSpeed = Math.round(d4 / (availableMinutes / 60));
    questions.push({
        scenario: `An aircraft must travel ${d4} km. It departs at ${formatTime(depTime.h, depTime.m)} and must arrive by ${formatTime(arrTime.h, arrTime.m)}.`,
        question: `What minimum speed (km/h) is required?`,
        answer: reqSpeed,
        tolerance: 10,
        type: 'number',
        hint: `Time available = ${availableMinutes} min = ${(availableMinutes/60).toFixed(2)}h. Speed = ${d4}/${(availableMinutes/60).toFixed(2)}`,
    });

    // Q5: Fuel with cargo constraint
    const cargo5 = pickFrom([500, 1000, 1500]);
    const maxSpeed5 = CARGO_TABLE.find(c => c.cargo === cargo5).maxSpeed;
    const d5 = pickFrom([200, 300, 400]);
    const flyTime5 = d5 / maxSpeed5;
    const fuelRate5 = SPEED_FUEL_TABLE.find(r => r.speed === maxSpeed5).fuel;
    const fuel5 = Math.round(fuelRate5 * flyTime5);
    questions.push({
        scenario: `An aircraft carries ${cargo5} kg of cargo (max speed with cargo: ${maxSpeed5} km/h per cargo chart). It must fly ${d5} km at maximum allowed speed.`,
        question: `How much fuel is needed (in litres)?`,
        answer: fuel5,
        tolerance: 5,
        type: 'number',
        hint: `Time = ${d5}/${maxSpeed5} = ${flyTime5.toFixed(2)}h. Fuel = ${fuelRate5} × ${flyTime5.toFixed(2)}`,
    });

    // Q6: Return trip time
    const s6out = pickFrom([200, 250, 300]);
    const s6ret = pickFrom([150, 200, 250]);
    const d6 = pickFrom([150, 200, 300]);
    const totalMins = Math.round((d6/s6out + d6/s6ret) * 60);
    questions.push({
        scenario: `An aircraft flies ${d6} km to a target at ${s6out} km/h, then returns at ${s6ret} km/h (carrying cargo).`,
        question: `What is the total flight time in minutes?`,
        answer: totalMins,
        tolerance: 3,
        type: 'number',
        hint: `Out: ${d6}/${s6out}h. Return: ${d6}/${s6ret}h. Total: ${(d6/s6out + d6/s6ret).toFixed(2)}h`,
    });

    // Q7: Remaining fuel
    const tankSize = pickFrom([300, 400, 500]);
    const s7 = pickFrom([200, 250, 300]);
    const fuelRate7 = SPEED_FUEL_TABLE.find(r => r.speed === s7).fuel;
    const d7 = pickFrom([200, 300, 400]);
    const fuelUsed = Math.round(fuelRate7 * (d7 / s7));
    const remaining = tankSize - fuelUsed;
    questions.push({
        scenario: `An aircraft has ${tankSize} litres of fuel. It flies ${d7} km at ${s7} km/h.`,
        question: `How many litres of fuel remain after the journey?`,
        answer: remaining,
        tolerance: 5,
        type: 'number',
        hint: `Fuel used = ${fuelRate7} × ${(d7/s7).toFixed(2)} = ${fuelUsed}L. Remaining = ${tankSize} - ${fuelUsed}`,
    });

    // Q8: Maximum range
    const fuel8 = pickFrom([300, 400, 500]);
    const s8 = pickFrom([200, 250, 300]);
    const fuelRate8 = SPEED_FUEL_TABLE.find(r => r.speed === s8).fuel;
    const maxTime = fuel8 / fuelRate8; // hours
    const maxDist = Math.round(s8 * maxTime);
    questions.push({
        scenario: `An aircraft has ${fuel8} litres of fuel and flies at ${s8} km/h (fuel consumption: ${fuelRate8} L/h).`,
        question: `What is the maximum distance it can fly (in km)?`,
        answer: maxDist,
        tolerance: 10,
        type: 'number',
        hint: `Max time = ${fuel8}/${fuelRate8} = ${maxTime.toFixed(2)}h. Distance = ${s8} × ${maxTime.toFixed(2)}`,
    });

    return questions;
}

function pickFrom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function formatTime(h, m) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function addMinutesToTime(h, m, addMins) {
    const totalMins = h * 60 + m + addMins;
    const newH = Math.floor(totalMins / 60) % 24;
    const newM = totalMins % 60;
    return formatTime(newH, newM);
}

function buildFuelTableHTML() {
    let html = '<table><tr><th>Speed (km/h)</th><th>Fuel (L/h)</th></tr>';
    SPEED_FUEL_TABLE.forEach(r => {
        html += `<tr><td>${r.speed}</td><td>${r.fuel}</td></tr>`;
    });
    html += '</table>';
    return html;
}

function buildCargoTableHTML() {
    let html = '<table><tr><th>Cargo (kg)</th><th>Max Speed (km/h)</th></tr>';
    CARGO_TABLE.forEach(r => {
        html += `<tr><td>${r.cargo}</td><td>${r.maxSpeed}</td></tr>`;
    });
    html += '</table>';
    return html;
}

export function create(ctx) {
    let correct = 0;
    let total = 0;
    let destroyed = false;
    let qIndex = 0;
    let questions = [];
    let responseTimes = [];

    function showQuestion() {
        if (destroyed || qIndex >= questions.length) {
            finishTest();
            return;
        }

        const q = questions[qIndex];
        const questionStart = performance.now();

        ctx.container.innerHTML = `
            <div style="display:flex;gap:16px;max-width:1000px;width:100%;flex-wrap:wrap">
                <div class="ant-scenario" style="flex:1;min-width:280px">
                    <h3>Reference Charts</h3>
                    <p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:8px"><strong>Speed &amp; Fuel Consumption</strong></p>
                    ${buildFuelTableHTML()}
                    <p style="font-size:0.85rem;color:var(--text-secondary);margin:8px 0"><strong>Cargo &amp; Max Speed</strong></p>
                    ${buildCargoTableHTML()}
                </div>
                <div style="flex:1;min-width:280px;display:flex;flex-direction:column;align-items:center;justify-content:center">
                    <div class="ant-scenario" style="width:100%">
                        <h3>Scenario</h3>
                        <p>${q.scenario}</p>
                    </div>
                    <div class="ant-question">${q.question}</div>
                    <div class="ant-input-row">
                        <input type="text" class="num-ops-input" id="ant-input"
                               inputmode="${q.type === 'time' ? 'text' : 'numeric'}"
                               placeholder="${q.type === 'time' ? 'HH:MM' : 'Enter number'}"
                               autocomplete="off" autofocus>
                        <button class="btn btn-primary" id="ant-submit">Submit</button>
                    </div>
                    <p class="text-muted mt-2" style="font-size:0.75rem">
                        ${q.type === 'time' ? 'Enter time as HH:MM (24h format)' : 'Enter a number. Close answers within ±' + q.tolerance + ' are accepted.'}
                    </p>
                </div>
            </div>
        `;

        const input = document.getElementById('ant-input');
        const submitBtn = document.getElementById('ant-submit');
        input.focus();

        function submit() {
            if (destroyed) return;
            const rawValue = input.value.trim();
            if (!rawValue) return;

            total++;
            qIndex++;
            const responseTime = (performance.now() - questionStart) / 1000;
            responseTimes.push(responseTime);

            let isCorrect = false;
            if (q.type === 'time') {
                // Parse time answer
                isCorrect = rawValue === String(q.answer);
                // Also accept close times
                if (!isCorrect && rawValue.includes(':')) {
                    const [uh, um] = rawValue.split(':').map(Number);
                    const [ah, am] = String(q.answer).split(':').map(Number);
                    if (!isNaN(uh) && !isNaN(um) && !isNaN(ah) && !isNaN(am)) {
                        const diff = Math.abs((uh * 60 + um) - (ah * 60 + am));
                        isCorrect = diff <= q.tolerance;
                    }
                }
            } else {
                const userNum = parseFloat(rawValue);
                if (!isNaN(userNum)) {
                    isCorrect = Math.abs(userNum - q.answer) <= q.tolerance;
                }
            }

            if (isCorrect) correct++;

            // Show brief feedback
            input.style.borderColor = isCorrect ? 'var(--accent-green)' : 'var(--danger)';
            input.style.color = isCorrect ? 'var(--accent-green)' : 'var(--danger)';
            submitBtn.disabled = true;

            ctx.onUpdateHud({ score: correct, question: `Q${qIndex}/${questions.length}` });

            setTimeout(() => showQuestion(), 800);
        }

        submitBtn.addEventListener('click', submit);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') submit();
        });

        ctx.onUpdateHud({ question: `Q${qIndex + 1}/${questions.length}` });
    }

    function finishTest() {
        if (destroyed) return;
        destroyed = true;
        ctx.stopTimer();

        const avgTime = responseTimes.length > 0
            ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
            : 0;

        // Scoring: combination of accuracy and speed
        const pct = total > 0 ? (correct / total) * 100 : 0;
        let percentile;
        if (pct < 15) percentile = 2;
        else if (pct < 25) percentile = 7;
        else if (pct < 35) percentile = 17;
        else if (pct < 45) percentile = 31;
        else if (pct < 55) percentile = 50;
        else if (pct < 68) percentile = 68;
        else if (pct < 80) percentile = 83;
        else if (pct < 90) percentile = 92;
        else percentile = 98;

        // Speed bonus
        if (total >= questions.length && avgTime < 30) {
            percentile = Math.min(99, percentile + 5);
        }

        ctx.onComplete({
            correct,
            total,
            avgTime,
            stanine: percentileToStanine(percentile),
            details: `Answered ${total} of ${questions.length} mission questions. Close estimates were accepted.`,
        });
    }

    return {
        start() {
            questions = generateQuestions();
            ctx.startTimer(480); // 8 min
            showQuestion();
        },
        onTimeUp() { finishTest(); },
        destroy() { destroyed = true; },
    };
}
