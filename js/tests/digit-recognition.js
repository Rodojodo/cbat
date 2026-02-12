// ============================================
// Digit Recognition Test
// Short-term visual memory for number strings
// ============================================

import { percentileToStanine } from '../scoring.js';

export function getInstructions() {
    return `
        <p>This test measures your short-term visual memory for numbers.</p>
        <ul>
            <li>A string of digits will appear on screen for a few seconds.</li>
            <li>Memorise the digits as best you can.</li>
            <li>After the digits disappear, answer a multiple-choice question about what you saw.</li>
            <li>String length increases from 5 digits up to 15 digits as you progress.</li>
            <li>Questions may ask: how many of a specific digit, what was the Nth digit, or similar.</li>
            <li>You have <strong>4 minutes</strong> total.</li>
        </ul>
    `;
}

export function create(ctx) {
    let correct = 0;
    let total = 0;
    let destroyed = false;
    let round = 0;
    let responseTimes = [];

    const ROUNDS = 20;

    function getDigitLength() {
        // Start at 5 digits, increase every 2 rounds up to 15
        return Math.min(5 + Math.floor(round / 2), 15);
    }

    function generateDigitString(len) {
        let s = '';
        for (let i = 0; i < len; i++) {
            s += Math.floor(Math.random() * 10).toString();
        }
        return s;
    }

    function generateQuestion(digits) {
        const questionTypes = [
            () => {
                const target = digits[Math.floor(Math.random() * digits.length)];
                const count = [...digits].filter(d => d === target).length;
                const options = generateOptions(count, 0, digits.length);
                return {
                    text: `How many times does the digit "${target}" appear?`,
                    answer: count,
                    options,
                };
            },
            () => {
                const pos = Math.floor(Math.random() * digits.length);
                const ordinal = getOrdinal(pos + 1);
                const correctDigit = parseInt(digits[pos]);
                const options = generateOptions(correctDigit, 0, 9);
                return {
                    text: `What was the ${ordinal} digit?`,
                    answer: correctDigit,
                    options,
                };
            },
            () => {
                const target = Math.floor(Math.random() * 10).toString();
                const present = digits.includes(target);
                return {
                    text: `Was the digit "${target}" present in the sequence?`,
                    answer: present ? 1 : 0,
                    options: [
                        { value: 1, label: 'Yes' },
                        { value: 0, label: 'No' },
                    ],
                };
            },
            () => {
                const last = parseInt(digits[digits.length - 1]);
                const options = generateOptions(last, 0, 9);
                return {
                    text: 'What was the last digit?',
                    answer: last,
                    options,
                };
            },
            () => {
                const first = parseInt(digits[0]);
                const options = generateOptions(first, 0, 9);
                return {
                    text: 'What was the first digit?',
                    answer: first,
                    options,
                };
            },
        ];

        const fn = questionTypes[Math.floor(Math.random() * questionTypes.length)];
        return fn();
    }

    function generateOptions(correctValue, min, max) {
        const opts = new Set([correctValue]);
        while (opts.size < 4) {
            let v = Math.floor(Math.random() * (max - min + 1)) + min;
            opts.add(v);
        }
        return [...opts]
            .sort(() => Math.random() - 0.5)
            .map(v => ({ value: v, label: String(v) }));
    }

    function getOrdinal(n) {
        const s = ['th', 'st', 'nd', 'rd'];
        const v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
    }

    function showDigits() {
        if (destroyed || round >= ROUNDS) {
            finishTest();
            return;
        }

        const len = getDigitLength();
        const digits = generateDigitString(len);
        const displayTime = Math.max(2000, Math.min(5000, len * 400));

        ctx.container.innerHTML = `
            <p class="text-muted mb-2">Memorise these digits (${len} digits)</p>
            <div class="digit-display">${digits}</div>
        `;

        ctx.onUpdateHud({ question: `Round ${round + 1}/${ROUNDS}` });

        setTimeout(() => {
            if (destroyed) return;
            showQuestion(digits);
        }, displayTime);
    }

    function showQuestion(digits) {
        if (destroyed) return;
        const q = generateQuestion(digits);
        const questionStart = performance.now();

        ctx.container.innerHTML = `
            <p class="mb-4" style="font-size:1.1rem;font-weight:600">${q.text}</p>
            <div class="digit-options" id="digit-options"></div>
        `;

        const optContainer = document.getElementById('digit-options');
        q.options.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'digit-option-btn';
            btn.textContent = opt.label;
            btn.addEventListener('click', () => {
                if (destroyed) return;
                total++;
                round++;
                const responseTime = (performance.now() - questionStart) / 1000;
                responseTimes.push(responseTime);

                const isCorrect = opt.value === q.answer;
                if (isCorrect) correct++;

                // Flash feedback
                btn.classList.add(isCorrect ? 'correct' : 'wrong');
                // Show correct answer if wrong
                if (!isCorrect) {
                    optContainer.querySelectorAll('.digit-option-btn').forEach(b => {
                        if (b.textContent === String(q.answer)) b.classList.add('correct');
                    });
                }

                ctx.onUpdateHud({ score: correct });

                setTimeout(() => showDigits(), 600);
            });
            optContainer.appendChild(btn);
        });
    }

    function finishTest() {
        if (destroyed) return;
        destroyed = true;
        ctx.stopTimer();

        const avgTime = responseTimes.length > 0
            ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
            : 0;

        // Scoring based on correct answers out of rounds completed
        const pct = total > 0 ? (correct / total) * 100 : 0;
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

        // Bonus for completing more rounds (speed factor)
        if (total >= 18) percentile = Math.min(99, percentile + 5);
        if (total >= ROUNDS) percentile = Math.min(99, percentile + 5);

        ctx.onComplete({
            correct,
            total,
            avgTime,
            stanine: percentileToStanine(percentile),
            details: `Completed ${total} rounds. Max digit length reached: ${getDigitLength()}.`,
        });
    }

    return {
        start() {
            ctx.startTimer(240); // 4 min
            showDigits();
        },
        onTimeUp() {
            finishTest();
        },
        destroy() {
            destroyed = true;
        },
    };
}
