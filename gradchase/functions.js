// ============================================================
// Shared loss function definitions for Gradient Descent Game V5
//
// Expects global variables: dataX, dataY, lambda, funcParams
// Used by both the 2D game (script.js) and the 3D viewer (3d.html)
// ============================================================

// Sigmoid helper
function sigmoid(z) {
    return z >= 0
        ? 1 / (1 + Math.exp(-z))
        : Math.exp(z) / (1 + Math.exp(z));
}

// BCE component (shared by classification functions)
function bceComponent(a, b) {
    const n = dataX.length;
    let loss = 0;
    for (let i = 0; i < n; i++) {
        const p = sigmoid(a * dataX[i] + b);
        const pc = Math.max(1e-12, Math.min(1 - 1e-12, p));
        loss += -(dataY[i] * Math.log(pc) + (1 - dataY[i]) * Math.log(1 - pc));
    }
    return loss / n;
}

// BCE gradient components (shared by classification functions)
function bceGradient(a, b) {
    const n = dataX.length;
    let ga = 0, gb = 0;
    for (let i = 0; i < n; i++) {
        const p = sigmoid(a * dataX[i] + b);
        const diff = p - dataY[i];
        ga += diff * dataX[i];
        gb += diff;
    }
    return { ga: ga / n, gb: gb / n };
}

// Huber loss component (robust regression)
// delta is the threshold between quadratic and linear regions
const HUBER_DELTA = 1.35;

function huberComponent(a, b) {
    const n = dataX.length;
    let loss = 0;
    for (let i = 0; i < n; i++) {
        const r = dataY[i] - a * dataX[i] - b;
        const ar = Math.abs(r);
        if (ar <= HUBER_DELTA) {
            loss += 0.5 * r * r;
        } else {
            loss += HUBER_DELTA * (ar - 0.5 * HUBER_DELTA);
        }
    }
    return loss / n;
}

function huberGradient(a, b) {
    const n = dataX.length;
    let ga = 0, gb = 0;
    for (let i = 0; i < n; i++) {
        const r = dataY[i] - a * dataX[i] - b;
        let dr;
        if (r > HUBER_DELTA) dr = -HUBER_DELTA;
        else if (r < -HUBER_DELTA) dr = HUBER_DELTA;
        else dr = -r;
        ga += dr * dataX[i];
        gb += dr;
    }
    return { ga: ga / n, gb: gb / n };
}

// Hinge loss component (SVM with y in {-1, +1})
function hingeComponent(a, b) {
    const n = dataX.length;
    let loss = 0;
    for (let i = 0; i < n; i++) {
        const margin = dataY[i] * (a * dataX[i] + b);
        loss += Math.max(0, 1 - margin);
    }
    return loss / n;
}

function hingeGradient(a, b) {
    const n = dataX.length;
    let ga = 0, gb = 0;
    for (let i = 0; i < n; i++) {
        const margin = dataY[i] * (a * dataX[i] + b);
        if (margin < 1) {
            ga += -dataY[i] * dataX[i];
            gb += -dataY[i];
        }
    }
    return { ga: ga / n, gb: gb / n };
}

// Neuron MSE component: model is y_hat = sigmoid(a*x + b), loss = MSE
function neuronMseComponent(a, b) {
    const n = dataX.length;
    let loss = 0;
    for (let i = 0; i < n; i++) {
        const pred = sigmoid(a * dataX[i] + b);
        const r = dataY[i] - pred;
        loss += r * r;
    }
    return loss / n;
}

function neuronMseGradient(a, b) {
    const n = dataX.length;
    let ga = 0, gb = 0;
    for (let i = 0; i < n; i++) {
        const z = a * dataX[i] + b;
        const s = sigmoid(z);
        const r = dataY[i] - s;
        const ds = s * (1 - s); // sigmoid derivative
        ga += -2 * r * ds * dataX[i];
        gb += -2 * r * ds;
    }
    return { ga: ga / n, gb: gb / n };
}

// MSE component (shared by regression functions)
function mseComponent(a, b) {
    let mse = 0;
    for (let i = 0; i < dataX.length; i++) {
        const r = dataY[i] - a * dataX[i] - b;
        mse += r * r;
    }
    return mse / dataX.length;
}

// MSE gradient components (shared by regression functions)
function mseGradient(a, b) {
    let ga = 0, gb = 0;
    const n = dataX.length;
    for (let i = 0; i < n; i++) {
        const r = dataY[i] - a * dataX[i] - b;
        ga += -2 * dataX[i] * r;
        gb += -2 * r;
    }
    return { ga: ga / n, gb: gb / n };
}

// Function registry
// NOTE: regression entries reference globals (lambda, funcParams, etc.)
// so they must be called after those globals are initialized.
const testFunctions = {
    lasso: {
        type: 'regression',
        name: 'Lasso Regression (L1)',
        f: (a, b) => mseComponent(a, b) + lambda * Math.abs(a),
        gradient: (a, b) => {
            const { ga, gb } = mseGradient(a, b);
            let penGA = ga;
            if (a > 1e-8) penGA += lambda;
            else if (a < -1e-8) penGA -= lambda;
            return { gx: penGA, gy: gb };
        },
        getFormula: () => `L(a,b) = MSE + ${lambda.toFixed(1)}\u00B7|a|`,
        penalty: (a) => lambda * Math.abs(a),
        contourStep: 3,
        defaultColormap: 'sqrt',
        defaultZScale: 0.3
    },
    ridge: {
        type: 'regression',
        name: 'Ridge Regression (L2)',
        f: (a, b) => mseComponent(a, b) + lambda * a * a,
        gradient: (a, b) => {
            const { ga, gb } = mseGradient(a, b);
            return { gx: ga + 2 * lambda * a, gy: gb };
        },
        getFormula: () => `L(a,b) = MSE + ${lambda.toFixed(1)}\u00B7a\u00B2`,
        penalty: (a) => lambda * a * a,
        contourStep: 3,
        defaultColormap: 'sqrt',
        defaultZScale: 0.3
    },
    linear: {
        type: 'regression',
        name: 'Linear Regression (OLS)',
        f: (a, b) => mseComponent(a, b),
        gradient: (a, b) => {
            const { ga, gb } = mseGradient(a, b);
            return { gx: ga, gy: gb };
        },
        getFormula: () => 'L(a,b) = MSE',
        penalty: () => 0,
        contourStep: 3,
        defaultColormap: 'sqrt',
        defaultZScale: 0.3
    },
    huber: {
        type: 'regression',
        name: 'Huber Regression',
        f: (a, b) => huberComponent(a, b),
        gradient: (a, b) => {
            const { ga, gb } = huberGradient(a, b);
            return { gx: ga, gy: gb };
        },
        getFormula: () => `L(a,b) = Huber(\u03B4=${HUBER_DELTA})`,
        penalty: () => 0,
        contourStep: 1,
        defaultColormap: 'sqrt',
        defaultZScale: 0.3
    },
    logistic: {
        type: 'classification',
        name: 'Logistic Regression',
        f: (a, b) => bceComponent(a, b),
        gradient: (a, b) => {
            const { ga, gb } = bceGradient(a, b);
            return { gx: ga, gy: gb };
        },
        getFormula: () => 'L(a,b) = BCE(\u03C3(a\u00B7x+b), y)',
        penalty: () => 0,
        contourStep: 0.3,
        defaultColormap: 'sqrt',
        defaultZScale: 0.3
    },
    svm: {
        type: 'classification',
        name: 'SVM (Hinge Loss)',
        f: (a, b) => hingeComponent(a, b),
        gradient: (a, b) => {
            const { ga, gb } = hingeGradient(a, b);
            return { gx: ga, gy: gb };
        },
        getFormula: () => 'L(a,b) = (1/n)\u03A3 max(0, 1\u2212y\u1D62(ax\u1D62+b))',
        penalty: () => 0,
        contourStep: 0.3,
        defaultColormap: 'sqrt',
        defaultZScale: 0.3
    },
    neuron: {
        type: 'neuron',
        name: 'Single Neuron',
        f: (a, b) => neuronMseComponent(a, b),
        gradient: (a, b) => {
            const { ga, gb } = neuronMseGradient(a, b);
            return { gx: ga, gy: gb };
        },
        getFormula: () => 'L(a,b) = (1/n)\u03A3(y\u1D62 \u2212 \u03C3(ax\u1D62+b))\u00B2',
        penalty: () => 0,
        contourStep: 0.05,
        defaultColormap: 'sqrt',
        defaultZScale: 0.3
    },
    himmelblau: {
        type: 'classic',
        name: "Himmelblau's Function",
        f: (x, y) => {
            const { a, b } = funcParams.himmelblau;
            return Math.pow(x * x + y - a, 2) + Math.pow(x + y * y - b, 2);
        },
        gradient: (x, y) => {
            const { a, b } = funcParams.himmelblau;
            const u = x * x + y - a;
            const v = x + y * y - b;
            return { gx: 4 * x * u + 2 * v, gy: 2 * u + 4 * y * v };
        },
        bounds: { xMin: -6, xMax: 6, yMin: -6, yMax: 6 },
        getFormula: () => {
            const { a, b } = funcParams.himmelblau;
            return `f(x,y) = (x\u00B2 + y \u2212 ${a.toFixed(1)})\u00B2 + (x + y\u00B2 \u2212 ${b.toFixed(1)})\u00B2`;
        },
        getMinimumHint: null,
        contourStep: 20,
        defaultColormap: 'log',
        defaultZScale: 0.05
    },
    rosenbrock: {
        type: 'classic',
        name: "Rosenbrock's Function",
        f: (x, y) => {
            const { a, b } = funcParams.rosenbrock;
            return Math.pow(a - x, 2) + b * Math.pow(y - x * x, 2);
        },
        gradient: (x, y) => {
            const { a, b } = funcParams.rosenbrock;
            return {
                gx: -2 * (a - x) - 4 * b * x * (y - x * x),
                gy: 2 * b * (y - x * x)
            };
        },
        bounds: { xMin: -2, xMax: 2, yMin: -1, yMax: 3 },
        getFormula: () => {
            const { a, b } = funcParams.rosenbrock;
            return `f(x,y) = (${a.toFixed(1)} \u2212 x)\u00B2 + ${b.toFixed(0)}(y \u2212 x\u00B2)\u00B2`;
        },
        getMinimumHint: () => {
            const { a } = funcParams.rosenbrock;
            return { x: a, y: a * a };
        },
        contourStep: 30,
        defaultColormap: 'log',
        defaultZScale: 0.01
    },
    maze: {
        type: 'classic',
        name: 'Gaussian Maze',
        f: (x, y) => {
            const { baseLevel, gaussians } = funcParams.maze;
            let val = baseLevel;
            for (let i = 0; i < gaussians.length; i++) {
                const g = gaussians[i];
                const dx = x - g.cx;
                const dy = y - g.cy;
                val += g.h * Math.exp(-(dx * dx + dy * dy) / (2 * g.sigma * g.sigma));
            }
            return val;
        },
        gradient: (x, y) => {
            const { gaussians } = funcParams.maze;
            let gx = 0, gy = 0;
            for (let i = 0; i < gaussians.length; i++) {
                const g = gaussians[i];
                const dx = x - g.cx;
                const dy = y - g.cy;
                const s2 = g.sigma * g.sigma;
                const e = g.h * Math.exp(-(dx * dx + dy * dy) / (2 * s2));
                gx += e * (-dx / s2);
                gy += e * (-dy / s2);
            }
            return { gx, gy };
        },
        bounds: { xMin: -6, xMax: 6, yMin: -6, yMax: 6 },
        getFormula: () => 'f(x,y) = Gaussian Maze',
        getMinimumHint: () => {
            const g = funcParams.maze.gaussians[0];
            return { x: g.cx, y: g.cy };
        },
        contourStep: 0.5,
        defaultColormap: 'sqrt',
        defaultZScale: 0.15
    },
};
