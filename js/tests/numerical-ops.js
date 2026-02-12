// ============================================
// Numerical Operations Test
// Rapid-fire mental arithmetic
// ============================================

import { percentileToStanine } from '../scoring.js';

export function getInstructions() {
    return `
        <p>This test measures your speed and accuracy with mental arithmetic.</p>
        <ul>
            <li>You will be shown simple arithmetic problems (addition, subtraction, multiplication, division).</li>
            <li>Type your answer and press <span class="key-hint">Enter</span> to submit.</li>
            <li>Work as quickly and accurately as possible.</li>
            <li>Once you type a digit it is submitted character by character — you cannot backspace.</li>
            <li>Difficulty increases as you progress.</li>
            <li>You have <strong>4 minutes</strong>.</li>
        </ul>
        <p>The test measures work rate — you are not expected to finish all questions.</p>
    `;
}

export function create(ctx) {
    let correct = 0;
    let total = 0;
    let startTime = null;
    let responseTimes = [];
    let questionStart = null;
    let currentAnswer = null;
    let inputEl = null;
    let destroyed = false;
    let difficulty = 1;

    function generateProblem() {
        const ops = ['+', '−', '×', '÷'];
        let a, b, op, answer;

        if (difficulty <= 3) {
            // Easy: single-digit ops
            op = ops[Math.floor(Math.random() * 4)];
            if (op === '+') {
                a = randInt(2, 9 + difficulty * 5);
                b = randInt(2, 9 + difficulty * 5);
                answer = a + b;
            } else if (op === '−') {
                b = randInt(2, 9 + difficulty * 3);
                answer = randInt(1, 9 + difficulty * 3);
                a = b + answer;
            } else if (op === '×') {
                a = randInt(2, 6 + difficulty * 2);
                b = randInt(2, 6 + difficulty);
                answer = a * b;
            } else {
                b = randInt(2, 6 + difficulty);
                answer = randInt(2, 6 + difficulty);
                a = b * answer;
            }
        } else {
            // Harder: larger numbers
            op = ops[Math.floor(Math.random() * 4)];
            if (op === '+') {
                a = randInt(10, 50 + difficulty * 10);
                b = randInt(10, 50 + difficulty * 10);
                answer = a + b;
            } else if (op === '−') {
                b = randInt(10, 40 + difficulty * 5);
                answer = randInt(1, 40 + difficulty * 5);
                a = b + answer;
            } else if (op === '×') {
                a = randInt(3, 12 + difficulty);
                b = randInt(3, 9 + difficulty);
                answer = a * b;
            } else {
                b = randInt(2, 9 + difficulty);
                answer = randInt(2, 12 + difficulty);
                a = b * answer;
            }
        }

        return { text: `${a} ${op} ${b}`, answer };
    }

    function randInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function showProblem() {
        if (destroyed) return;
        const problem = generateProblem();
        currentAnswer = problem.answer;
        questionStart = performance.now();

        ctx.container.innerHTML = `
            <div class="num-ops-problem">${problem.text}</div>
            <input type="text" class="num-ops-input" id="num-ops-input" inputmode="numeric" autocomplete="off" autofocus>
        `;

        inputEl = document.getElementById('num-ops-input');
        inputEl.focus();

        inputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                submitAnswer();
            }
        });

        ctx.onUpdateHud({
            question: `Q${total + 1}`,
            score: correct,
        });
    }

    function submitAnswer() {
        if (!inputEl || destroyed) return;
        const userAnswer = parseInt(inputEl.value, 10);
        total++;

        const responseTime = (performance.now() - questionStart) / 1000;
        responseTimes.push(responseTime);

        if (userAnswer === currentAnswer) {
            correct++;
            // Increase difficulty every 5 correct
            difficulty = Math.floor(correct / 5) + 1;
        }

        ctx.onUpdateHud({ score: correct });
        showProblem();
    }

    return {
        start() {
            startTime = performance.now();
            ctx.startTimer(240); // 4 minutes
            showProblem();
        },

        onTimeUp() {
            if (destroyed) return;
            destroyed = true;
            const avgTime = responseTimes.length > 0
                ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
                : 0;

            // Scoring: based on correct answers in 4 minutes
            // Approximate stanine boundaries (correct answers):
            // S1: 0-8, S2: 9-14, S3: 15-20, S4: 21-28, S5: 29-36
            // S6: 37-44, S7: 45-54, S8: 55-65, S9: 66+
            let percentile;
            if (correct <= 8) percentile = 2;
            else if (correct <= 14) percentile = 7;
            else if (correct <= 20) percentile = 17;
            else if (correct <= 28) percentile = 31;
            else if (correct <= 36) percentile = 50;
            else if (correct <= 44) percentile = 68;
            else if (correct <= 54) percentile = 83;
            else if (correct <= 65) percentile = 92;
            else percentile = 98;

            ctx.onComplete({
                correct,
                total,
                avgTime,
                stanine: percentileToStanine(percentile),
                details: `Answered ${total} questions in 4 minutes. Difficulty reached level ${difficulty}.`,
            });
        },

        destroy() {
            destroyed = true;
        },
    };
}
