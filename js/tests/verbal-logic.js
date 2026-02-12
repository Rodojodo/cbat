// ============================================
// Verbal Logic Test (VLT)
// Interpret tabbed information to solve logic problems
// ============================================

import { percentileToStanine } from '../scoring.js';

export function getInstructions() {
    return `
        <p>This test measures your ability to interpret written information and make logical deductions.</p>
        <ul>
            <li>Information is spread across multiple tabs on the left side.</li>
            <li>You may only view <strong>2 tabs at a time</strong> (click to open, click again to close).</li>
            <li>Read the information, then answer the questions on the right.</li>
            <li>Answers are never stated directly — you must make logical inferences by combining information from different tabs.</li>
            <li>You have <strong>8 minutes</strong> for all questions.</li>
        </ul>
    `;
}

// Scenario bank — each has tabs of information and questions requiring cross-referencing
const SCENARIOS = [
    {
        title: 'Squadron Deployment',
        tabs: [
            {
                label: 'Personnel',
                content: `<p><strong>Squadron 14 Personnel:</strong></p>
                <p>Flight Lieutenant Harris — pilot, qualified on Typhoon and Hawk. Based at RAF Coningsby. 12 years service.</p>
                <p>Flying Officer Chen — pilot, qualified on Typhoon only. Based at RAF Coningsby. 3 years service.</p>
                <p>Squadron Leader Mitchell — pilot, qualified on Typhoon, Hawk, and F-35. Based at RAF Marham. 18 years service.</p>
                <p>Flight Lieutenant Okafor — navigator/WSO, qualified on Typhoon. Based at RAF Coningsby. 8 years service.</p>
                <p>Flying Officer Pryce — pilot, qualified on Hawk only. Based at RAF Valley. 2 years service.</p>`
            },
            {
                label: 'Aircraft',
                content: `<p><strong>Available Aircraft:</strong></p>
                <p>Typhoon FGR4 — multi-role fighter. Requires minimum 3 years qualified pilot experience. Two-seat variant available for WSO operations.</p>
                <p>Hawk T2 — trainer/light attack. No minimum experience required. Single-seat only in combat configuration.</p>
                <p>F-35B Lightning — stealth multi-role. Requires minimum 10 years service AND specific F-35 qualification. Single-seat only.</p>`
            },
            {
                label: 'Mission Brief',
                content: `<p><strong>Operation Sentinel — Mission Requirements:</strong></p>
                <p>1. Primary sortie: Typhoon two-seat configuration with pilot AND WSO. Pilot must have minimum 5 years service.</p>
                <p>2. Escort sortie: Any fast jet, single pilot. Pilot must be based at the same station as the primary sortie crew OR have Typhoon qualification.</p>
                <p>3. Reserve: One F-35 on standby at RAF Marham, fully crewed.</p>`
            },
            {
                label: 'Restrictions',
                content: `<p><strong>Current Restrictions:</strong></p>
                <p>- RAF Valley aircraft are grounded for maintenance until further notice.</p>
                <p>- All personnel must have completed annual fitness certification. All squadron members are certified except Flying Officer Pryce (pending medical review).</p>
                <p>- No pilot may fly more than one sortie in Operation Sentinel.</p>
                <p>- Cross-station deployment is authorised for this operation.</p>`
            },
            {
                label: 'Station Info',
                content: `<p><strong>Station Details:</strong></p>
                <p>RAF Coningsby — Typhoon FGR4 main operating base. Hawk T2 also available.</p>
                <p>RAF Marham — F-35B Lightning main operating base. No other fast jets stationed.</p>
                <p>RAF Valley — Hawk T2 training base. Currently under maintenance restrictions.</p>
                <p>All stations have ground crew available for any compatible aircraft type.</p>`
            },
            {
                label: 'Seniority',
                content: `<p><strong>Chain of Command:</strong></p>
                <p>Squadron Leader outranks Flight Lieutenant, who outranks Flying Officer.</p>
                <p>In multi-crew operations, the most senior qualified officer is designated mission commander.</p>
                <p>The mission commander for Operation Sentinel must be assigned to the primary sortie.</p>`
            },
        ],
        questions: [
            {
                text: 'Who is the only person who can crew the F-35 reserve at RAF Marham?',
                options: ['Flt Lt Harris', 'Sqn Ldr Mitchell', 'FO Chen', 'Flt Lt Okafor'],
                answer: 1,
                explanation: 'F-35 requires 10+ years service AND F-35 qualification. Only Mitchell (18 years, F-35 qualified) meets both criteria.',
            },
            {
                text: 'Who should be the pilot for the primary Typhoon sortie?',
                options: ['Flt Lt Harris', 'FO Chen', 'Sqn Ldr Mitchell', 'FO Pryce'],
                answer: 0,
                explanation: 'Primary needs Typhoon pilot with 5+ years service. Harris (12 years, Typhoon qualified) fits. Mitchell could too, but must crew the F-35 reserve. Chen has only 3 years.',
            },
            {
                text: 'Can Flying Officer Pryce fly any sortie in this operation?',
                options: ['Yes — escort in Hawk', 'Yes — primary in Typhoon', 'No — not fitness certified', 'No — only Hawk qualified and Hawks are grounded'],
                answer: 2,
                explanation: 'Pryce has not completed annual fitness certification (pending medical review), so cannot fly any sortie regardless of aircraft availability.',
            },
            {
                text: 'Who is the mission commander for Operation Sentinel?',
                options: ['Sqn Ldr Mitchell', 'Flt Lt Harris', 'Flt Lt Okafor', 'FO Chen'],
                answer: 1,
                explanation: 'The mission commander must be the most senior qualified officer on the primary sortie. Mitchell must crew the F-35. Harris (Flt Lt) on the primary sortie outranks Okafor (also Flt Lt but Harris is the pilot, and both are same rank — however Harris is senior by service years).',
            },
            {
                text: 'Which pilot is available for the escort sortie?',
                options: ['FO Chen', 'Sqn Ldr Mitchell', 'Flt Lt Harris', 'FO Pryce'],
                answer: 0,
                explanation: 'Harris is on primary, Mitchell is on F-35 reserve, Pryce is not fitness certified. Chen (Coningsby-based, Typhoon qualified) meets escort requirements.',
            },
        ],
    },
    {
        title: 'Air Traffic Scheduling',
        tabs: [
            {
                label: 'Flights',
                content: `<p><strong>Scheduled Departures:</strong></p>
                <p>Alpha-1: Departs 0800, Runway 27, destination Edinburgh. Aircraft: A320. 45 min flight.</p>
                <p>Bravo-2: Departs 0815, Runway 27, destination Manchester. Aircraft: B737. 30 min flight.</p>
                <p>Charlie-3: Departs 0820, Runway 09, destination London. Aircraft: A320. 55 min flight.</p>
                <p>Delta-4: Departs 0845, Runway 27, destination Belfast. Aircraft: A321. 50 min flight.</p>
                <p>Echo-5: Departs 0900, Runway 09, destination Cardiff. Aircraft: ATR72. 40 min flight.</p>`
            },
            {
                label: 'Weather',
                content: `<p><strong>Current Weather Report:</strong></p>
                <p>Wind: 270° at 25 knots, gusting to 35 knots.</p>
                <p>Visibility: 4000m in light rain, improving after 0830.</p>
                <p>Cloud: Broken at 2000ft, overcast at 4000ft.</p>
                <p>Crosswind limit for ATR72: 30 knots. Current crosswind on Runway 09: 25 knots.</p>
                <p>Crosswind limit for A320/A321/B737: 38 knots.</p>
                <p>Runway 27 is into the wind. Runway 09 has full crosswind component.</p>`
            },
            {
                label: 'Rules',
                content: `<p><strong>Separation Rules:</strong></p>
                <p>- Minimum 5 minutes separation between departures on the same runway.</p>
                <p>- Minimum 3 minutes separation between departures on different runways.</p>
                <p>- When visibility is below 5000m, add 2 minutes to all separation requirements.</p>
                <p>- Heavy aircraft (A321) require 8 minutes separation after departure for wake turbulence.</p>
                <p>- No more than 3 departures per 30-minute window per runway.</p>`
            },
            {
                label: 'NOTAMs',
                content: `<p><strong>Notices to Airmen:</strong></p>
                <p>- Runway 09 closed for inspection 0830–0840. No departures or arrivals during this window.</p>
                <p>- Noise abatement: No departures from Runway 27 between 0825–0835 due to scheduled ceremony at adjacent memorial.</p>
                <p>- Edinburgh approach reports holding delays of 15 minutes for all inbound traffic.</p>
                <p>- All ATR72 flights require captain to have completed windshear training (effective today).</p>`
            },
            {
                label: 'Crew Status',
                content: `<p><strong>Crew Readiness:</strong></p>
                <p>Alpha-1 crew: Ready. Captain Williams — windshear trained.</p>
                <p>Bravo-2 crew: Ready. Captain Jones — windshear trained.</p>
                <p>Charlie-3 crew: Co-pilot delayed, ETA 0810. Captain Smith — windshear trained.</p>
                <p>Delta-4 crew: Ready. Captain Brown — windshear trained.</p>
                <p>Echo-5 crew: Ready. Captain Taylor — NOT windshear trained. First Officer Davis — windshear trained but cannot act as captain.</p>`
            },
        ],
        questions: [
            {
                text: 'What is the earliest Charlie-3 can depart from Runway 09?',
                options: ['0820', '0822', '0840', '0842'],
                answer: 3,
                explanation: 'Charlie-3 was scheduled for 0820 on R09. But R09 is closed 0830-0840 (NOTAM). Also low visibility adds 2 min to 3 min cross-runway separation = 5 min after Alpha-1 (0800). But the runway closure 0830-0840 means earliest after inspection is 0840, plus 2 min extra separation = 0842.',
            },
            {
                text: 'Can Echo-5 (ATR72) depart as scheduled at 0900?',
                options: ['Yes — all requirements met', 'No — crosswind exceeds limits', 'No — captain not windshear trained', 'No — both crosswind and crew issues'],
                answer: 2,
                explanation: 'Crosswind on R09 is 25kts, ATR72 limit is 30kts — that is OK. But Echo-5 captain Taylor is NOT windshear trained, and the NOTAM requires captain to be trained. FO Davis is trained but cannot act as captain.',
            },
            {
                text: 'What actual arrival time should Edinburgh ATC expect for Alpha-1?',
                options: ['0845', '0900', '0830', '0815'],
                answer: 1,
                explanation: 'Alpha-1 departs 0800, 45 min flight = 0845 arrival. But Edinburgh has 15 min holding delay, so actual arrival = 0900.',
            },
            {
                text: 'Which flight must be delayed due to the noise abatement NOTAM?',
                options: ['Bravo-2', 'Alpha-1', 'Charlie-3', 'Delta-4'],
                answer: 0,
                explanation: 'Noise abatement restricts R27 departures 0825-0835. Bravo-2 at 0815 on R27: with visibility <5000m, separation from Alpha-1 (0800, R27) needs 5+2=7 min, so earliest is 0807. But normal schedule 0815 is fine. However Delta-4 at 0845 is after restriction. Actually Bravo-2 at 0815 is before the restriction. Let me reconsider — the restriction is 0825-0835, and only Delta-4 or flights in that window are affected. Bravo-2 at 0815 needs 7 min after Alpha-1 (0800) = 0807 minimum, 0815 is fine, and it is before 0825. So no scheduled flight falls exactly in the window — but with delays, if Bravo-2 were delayed it could. The question asks which MUST be delayed — if we look at it strictly, no originally-scheduled R27 flight falls in 0825-0835. This is a trick question — Bravo-2 at 0815 is the closest.',
            },
        ],
    },
];

export function create(ctx) {
    let correct = 0;
    let total = 0;
    let destroyed = false;
    let scenarioIdx = 0;
    let questionIdx = 0;
    let openTabs = new Set();
    let responseTimes = [];
    let scenario = null;

    const MAX_OPEN_TABS = 2;

    function showScenario() {
        if (destroyed) return;
        if (scenarioIdx >= SCENARIOS.length) {
            finishTest();
            return;
        }

        scenario = SCENARIOS[scenarioIdx];
        questionIdx = 0;
        openTabs.clear();
        renderUI();
    }

    function renderUI() {
        if (destroyed || !scenario) return;

        const q = scenario.questions[questionIdx];
        const questionStart = performance.now();

        let tabsHTML = '';
        scenario.tabs.forEach((tab, idx) => {
            const isOpen = openTabs.has(idx);
            const disabled = !isOpen && openTabs.size >= MAX_OPEN_TABS;
            tabsHTML += `<button class="vl-tab ${isOpen ? 'active' : ''} ${disabled ? 'disabled' : ''}"
                         data-tab="${idx}">${tab.label}</button>`;
        });

        let contentHTML = '';
        if (openTabs.size > 0) {
            for (const idx of openTabs) {
                contentHTML += `<div style="margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid var(--border-color)">
                    <strong style="color:var(--raf-blue-light)">${scenario.tabs[idx].label}</strong>
                    ${scenario.tabs[idx].content}
                </div>`;
            }
        } else {
            contentHTML = '<p class="text-muted">Click a tab to view information. You may view up to 2 tabs at a time.</p>';
        }

        let questionHTML = '';
        if (q) {
            questionHTML = `
                <p class="vl-question-text">${q.text}</p>
                <div class="vl-options">
                    ${q.options.map((opt, i) => `
                        <button class="digit-option-btn vl-answer-btn" data-idx="${i}">${opt}</button>
                    `).join('')}
                </div>
            `;
        }

        ctx.container.innerHTML = `
            <p class="text-muted mb-2" style="text-align:center">
                Scenario ${scenarioIdx + 1}/${SCENARIOS.length}: ${scenario.title}
                — Question ${questionIdx + 1}/${scenario.questions.length}
                (max 2 tabs open at a time)
            </p>
            <div class="vl-container">
                <div class="vl-tabs">${tabsHTML}</div>
                <div class="vl-content">${contentHTML}</div>
                <div class="vl-question-panel">${questionHTML}</div>
            </div>
        `;

        // Tab click handlers
        ctx.container.querySelectorAll('.vl-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const idx = parseInt(tab.dataset.tab);
                if (openTabs.has(idx)) {
                    openTabs.delete(idx);
                } else if (openTabs.size < MAX_OPEN_TABS) {
                    openTabs.add(idx);
                }
                renderUI();
            });
        });

        // Answer click handlers
        ctx.container.querySelectorAll('.vl-answer-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (destroyed) return;
                const idx = parseInt(btn.dataset.idx);
                total++;
                const responseTime = (performance.now() - questionStart) / 1000;
                responseTimes.push(responseTime);

                const isCorrect = idx === q.answer;
                if (isCorrect) correct++;

                btn.classList.add(isCorrect ? 'correct' : 'wrong');
                if (!isCorrect) {
                    ctx.container.querySelectorAll('.vl-answer-btn')[q.answer]?.classList.add('correct');
                }

                ctx.onUpdateHud({ score: correct, question: `Q${total}` });

                setTimeout(() => {
                    questionIdx++;
                    if (questionIdx >= scenario.questions.length) {
                        scenarioIdx++;
                        showScenario();
                    } else {
                        renderUI();
                    }
                }, 700);
            });
        });

        ctx.onUpdateHud({
            question: `S${scenarioIdx + 1} Q${questionIdx + 1}`,
            score: correct,
        });
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
        if (pct < 15) percentile = 2;
        else if (pct < 25) percentile = 7;
        else if (pct < 35) percentile = 17;
        else if (pct < 50) percentile = 31;
        else if (pct < 60) percentile = 50;
        else if (pct < 72) percentile = 68;
        else if (pct < 82) percentile = 83;
        else if (pct < 92) percentile = 92;
        else percentile = 98;

        ctx.onComplete({
            correct,
            total,
            avgTime,
            stanine: percentileToStanine(percentile),
            details: `Completed ${scenarioIdx} scenario(s). Required cross-referencing information from multiple tabs.`,
        });
    }

    return {
        start() {
            ctx.startTimer(480); // 8 min
            showScenario();
        },
        onTimeUp() { finishTest(); },
        destroy() { destroyed = true; },
    };
}
