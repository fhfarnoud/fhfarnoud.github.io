// ============================================================
// Gradient Descent Game V5
// Based on V4 architecture (D3.js + SVG contours + spotlights)
//
// Regression: y = a*x + b with MSE + penalty
// Classic: Himmelblau, Rosenbrock
// ============================================================

// ============ DATA & MODEL ============

let trueA = 2.0;
let trueB = 1.0;

let noiseSigma = 1.0;
let lambda = 0.5;
let nPoints = 20;

let dataX = [];
let dataY = [];

let currentFunction = 'lasso';

// Random parameters for classic functions
let funcParams = {
    himmelblau: { a: 11, b: 7 },
    rosenbrock: { a: 1, b: 100 },
    maze: { baseLevel: 5, gaussians: [] }
};

// ============ DEMO PRESETS (deterministic instructor demos) ============
// Load via URL parameter: ?demo=linear, ?demo=lasso, ?demo=maze
const DEMO_PRESETS = {
    linear: {
        functionType: 'linear',
        trueA: 2, trueB: 1,
        nPoints: 15, noiseSigma: 1.0,
        dataX: [-4.5,-3.8571,-3.2143,-2.5714,-1.9286,-1.2857,-0.6429,0.0,0.6429,1.2857,1.9286,2.5714,3.2143,3.8571,4.5],
        dataY: [-7.5033,-6.8526,-4.7809,-2.6198,-3.0913,-1.8056,1.2935,1.7674,1.8162,4.114,4.3937,5.6771,7.6705,6.801,8.2751],
        startA: -0.5, startB: 3.5,
        lambda: 0,
        bounds: { xMin: -2, xMax: 6, yMin: -3, yMax: 5 }
    },
    lasso: {
        functionType: 'lasso',
        trueA: 2, trueB: 1,
        nPoints: 15, noiseSigma: 1.0,
        dataX: [-4.5,-3.8571,-3.2143,-2.5714,-1.9286,-1.2857,-0.6429,0.0,0.6429,1.2857,1.9286,2.5714,3.2143,3.8571,4.5],
        dataY: [-7.5033,-6.8526,-4.7809,-2.6198,-3.0913,-1.8056,1.2935,1.7674,1.8162,4.114,4.3937,5.6771,7.6705,6.801,8.2751],
        startA: -0.5, startB: 3.5,
        lambda: 2.0,
        bounds: { xMin: -2, xMax: 6, yMin: -3, yMax: 5 }
    },
    maze: {
        functionType: 'maze',
        trueA: 0, trueB: 0,
        nPoints: 15, noiseSigma: 1.0,
        dataX: [], dataY: [],
        mazeParams: {
            baseLevel: 5.0,
            gaussians: [
                { cx: 0, cy: 0, h: -8.0, sigma: 0.9 },
                { cx: 2.121, cy: 2.121, h: 6.0, sigma: 0.8 },
                { cx: 0, cy: 3.0, h: 6.0, sigma: 0.8 },
                { cx: -3.0, cy: 0, h: 6.0, sigma: 0.8 },
                { cx: 0, cy: -3.0, h: 6.0, sigma: 0.8 },
                { cx: 2.121, cy: -2.121, h: 6.0, sigma: 0.8 },
                { cx: 3.0, cy: 0, h: -2.5, sigma: 1.0 },
                { cx: -2.121, cy: 2.121, h: -2.5, sigma: 1.0 },
                { cx: -2.121, cy: -2.121, h: -2.5, sigma: 1.0 },
                { cx: 5.0, cy: 0, h: -4.0, sigma: 0.8 },
                { cx: -3.536, cy: 3.536, h: -3.0, sigma: 0.8 },
                { cx: -3.536, cy: -3.536, h: -5.0, sigma: 0.8 }
            ]
        },
        startA: 4, startB: -3,
        lambda: 0,
        bounds: { xMin: -7, xMax: 7, yMin: -7, yMax: 7 }
    }
};

let activeDemo = null;

function parseDemo() {
    const params = new URLSearchParams(window.location.search);
    const demo = params.get('demo');
    if (demo && DEMO_PRESETS[demo]) {
        activeDemo = demo;
    }
    // ?pacman=0 disables chase mode
    if (params.get('pacman') === '0') {
        monsterMode = false;
    }
    // ?optimizer=vanilla|momentum|nesterov|rmsprop|adam sets default optimizer
    const opt = params.get('optimizer');
    if (opt && ['vanilla', 'momentum', 'nesterov', 'rmsprop', 'adam'].includes(opt)) {
        gdMethod = opt;
    }
    // ?batch=N sets mini-batch size
    const batchParam = params.get('batch');
    if (batchParam) {
        const b = parseInt(batchParam);
        if (b >= 1) batchSize = b;
    }
    // ?lr=0.01 sets learning rate
    const lrParam = params.get('lr');
    if (lrParam) {
        const lr = parseFloat(lrParam);
        if (lr > 0) learningRate = lr;
    }
}

function loadPreset(key) {
    const preset = DEMO_PRESETS[key];
    if (!preset) return;

    // Set function type
    currentFunction = preset.functionType;
    els.functionSelect.value = preset.functionType;

    // Set model parameters
    trueA = preset.trueA;
    trueB = preset.trueB;
    noiseSigma = preset.noiseSigma || 1.0;
    lambda = preset.lambda;
    nPoints = preset.nPoints || 15;

    // Load fixed data (if data-driven function)
    if (preset.dataX && preset.dataX.length > 0) {
        dataX = [...preset.dataX];
        dataY = [...preset.dataY];
    }

    // Load maze params if present
    if (preset.mazeParams) {
        funcParams.maze = preset.mazeParams;
    }

    // Set bounds and starting position
    state.globalBounds = { ...preset.bounds };
    state.a = preset.startA;
    state.b = preset.startB;
    state.steps = 0;
    state.minF = Infinity;
    state.history = [];
    mapRevealed = false;
    hasWon = false;

    initialPosition = { a: state.a, b: state.b };

    // Reset GD path (but keep optimizer settings)
    gdPath = [];
    els.gdSteps.textContent = '--';
    els.gdFinal.textContent = '--';
    els.winBanner.classList.add('hidden');
    els.winBanner.style.background = '';

    // Update UI sliders to match preset (preserve batch size if user set it)
    els.lambdaSlider.value = lambda;
    els.lambdaValue.textContent = lambda.toFixed(1);
    els.sigmaSlider.value = noiseSigma;
    els.sigmaValue.textContent = noiseSigma.toFixed(1);
    els.npointsSlider.value = nPoints;
    els.npointsValue.textContent = nPoints;
    els.batchSizeSlider.max = nPoints;
    if (batchSize > nPoints) {
        batchSize = nPoints;
    }
    els.batchSizeSlider.value = batchSize;
    els.batchSizeValue.textContent = batchSize;

    if (monsterMode) spawnMonster();

    updateUIForFunction();
    updateFunctionDesc();
    buildD3Map();

    if (usesData()) {
        buildScatterPlot();
    } else {
        d3.select('#scatter-container').selectAll('*').remove();
        scatterSvg = null;
        scatterFitLine = null;
        scatterFitPath = null;
    }

    updateState();
    if (typeof rebuild3DPanel === 'function') rebuild3DPanel();
}

function generateMazeParams() {
    // 12 Gaussians: 1 central well, 5 ring walls, 3 gap floors, 3 outer wells
    const R = 3.0;   // ring radius
    const OR = 5.0;  // outer well radius
    const template = [
        // Central well (global minimum)
        { cx: 0, cy: 0, h: -8.0, sigma: 0.9 },
        // Ring walls at 45°, 90°, 180°, 270°, 315°
        { cx: R * Math.cos(Math.PI / 4), cy: R * Math.sin(Math.PI / 4), h: 6.0, sigma: 0.8 },
        { cx: R * Math.cos(Math.PI / 2), cy: R * Math.sin(Math.PI / 2), h: 6.0, sigma: 0.8 },
        { cx: R * Math.cos(Math.PI), cy: R * Math.sin(Math.PI), h: 6.0, sigma: 0.8 },
        { cx: R * Math.cos(3 * Math.PI / 2), cy: R * Math.sin(3 * Math.PI / 2), h: 6.0, sigma: 0.8 },
        { cx: R * Math.cos(7 * Math.PI / 4), cy: R * Math.sin(7 * Math.PI / 4), h: 6.0, sigma: 0.8 },
        // Gap floor lowering at 0°, 135°, 225°
        { cx: R, cy: 0, h: -2.5, sigma: 1.0 },
        { cx: R * Math.cos(3 * Math.PI / 4), cy: R * Math.sin(3 * Math.PI / 4), h: -2.5, sigma: 1.0 },
        { cx: R * Math.cos(5 * Math.PI / 4), cy: R * Math.sin(5 * Math.PI / 4), h: -2.5, sigma: 1.0 },
        // Outer local minima at 0°, 135°, 225°
        { cx: OR, cy: 0, h: -4.0, sigma: 0.8 },
        { cx: OR * Math.cos(3 * Math.PI / 4), cy: OR * Math.sin(3 * Math.PI / 4), h: -3.0, sigma: 0.8 },
        { cx: OR * Math.cos(5 * Math.PI / 4), cy: OR * Math.sin(5 * Math.PI / 4), h: -5.0, sigma: 0.8 },
    ];

    // Random rotation
    const theta = Math.random() * 2 * Math.PI;
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);

    // Random translation: keep global minimum within [-4, 4] to avoid edges
    const tx = -4 + Math.random() * 8;
    const ty = -4 + Math.random() * 8;

    const gaussians = template.map(t => ({
        cx: t.cx * cosT - t.cy * sinT + tx + gaussianRandom() * 0.15,
        cy: t.cx * sinT + t.cy * cosT + ty + gaussianRandom() * 0.15,
        h: t.h * (1 + 0.2 * (Math.random() - 0.5)),
        sigma: t.sigma * (1 + 0.1 * (Math.random() - 0.5))
    }));

    return { baseLevel: 5.0, gaussians };
}

function randomizeFuncParams() {
    // Randomize regression true parameters
    trueA = -3 + Math.random() * 6;   // -3 to 3
    trueB = -2 + Math.random() * 4;   // -2 to 2
    // Randomize classic function parameters
    funcParams = {
        himmelblau: {
            a: 8 + Math.random() * 6,
            b: 4 + Math.random() * 6
        },
        rosenbrock: {
            a: 0.5 + Math.random() * 1.5,
            b: 50 + Math.random() * 150
        },
        maze: generateMazeParams()
    };
}

// Box-Muller Gaussian
function gaussianRandom() {
    let u1 = Math.random();
    let u2 = Math.random();
    while (u1 === 0) u1 = Math.random();
    return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
}

function generateData() {
    dataX = [];
    dataY = [];
    for (let i = 0; i < nPoints; i++) {
        const xi = (Math.random() - 0.5) * 10; // x in [-5, 5]
        const yi = trueA * xi + trueB + noiseSigma * gaussianRandom();
        dataX.push(xi);
        dataY.push(yi);
    }
}

function generateClassificationData() {
    dataX = [];
    dataY = [];
    for (let i = 0; i < nPoints; i++) {
        const xi = (Math.random() - 0.5) * 10; // x in [-5, 5]
        const p = sigmoid(trueA * xi + trueB);
        const yi = Math.random() < p ? 1 : 0;
        dataX.push(xi);
        dataY.push(yi);
    }
}

function generateSvmData() {
    dataX = [];
    dataY = [];
    for (let i = 0; i < nPoints; i++) {
        const xi = (Math.random() - 0.5) * 10; // x in [-5, 5]
        const p = sigmoid(trueA * xi + trueB);
        const yi = Math.random() < p ? 1 : -1; // y in {-1, +1}
        dataX.push(xi);
        dataY.push(yi);
    }
}

function generateNeuronData() {
    dataX = [];
    dataY = [];
    for (let i = 0; i < nPoints; i++) {
        const xi = (Math.random() - 0.5) * 10; // x in [-5, 5]
        const yi = sigmoid(trueA * xi + trueB) + noiseSigma * 0.1 * gaussianRandom();
        dataX.push(xi);
        dataY.push(Math.max(0, Math.min(1, yi))); // clamp to [0, 1]
    }
}

// Generate appropriate data for the current function type
function regenerateData() {
    if (currentFunction === 'svm') generateSvmData();
    else if (currentFunction === 'neuron') generateNeuronData();
    else if (isClassification()) generateClassificationData();
    else generateData();
}

// ============ LOSS FUNCTIONS ============
// Core definitions (mseComponent, mseGradient, testFunctions) loaded from functions.js

// Game-specific description that includes batch/sigma info
function getDescription() {
    const func = testFunctions[currentFunction];
    if (func.type === 'classic') return func.getFormula();
    const bLabel = batchSize < nPoints ? `, batch=${batchSize}` : '';
    if (func.type === 'classification') {
        return `${func.getFormula()}  (n=${nPoints}${bLabel})`;
    }
    return `${func.getFormula()}  (\u03C3=${noiseSigma.toFixed(1)}, n=${nPoints}${bLabel})`;
}

// Wrapper functions (delegate to active function)
const f = (x, y) => testFunctions[currentFunction].f(x, y);
const gradientClean = (x, y) => testFunctions[currentFunction].gradient(x, y);

function isRegression() {
    return testFunctions[currentFunction].type === 'regression';
}
function isClassification() {
    return testFunctions[currentFunction].type === 'classification';
}
function isNeuron() {
    return testFunctions[currentFunction].type === 'neuron';
}
function usesData() {
    const t = testFunctions[currentFunction].type;
    return t !== 'classic';
}

// Stochastic gradient (mini-batch SGD for data-driven functions, clean for classic)
let batchSize = 20;

const gradient = (a, b) => {
    // Classic functions: always use clean gradient
    if (!usesData()) return gradientClean(a, b);

    const n = dataX.length;
    if (batchSize >= n) return gradientClean(a, b);

    // Sample batchSize random indices (Fisher-Yates partial shuffle)
    const pool = [];
    for (let i = 0; i < n; i++) pool.push(i);
    for (let i = 0; i < batchSize; i++) {
        const j = i + Math.floor(Math.random() * (n - i));
        const tmp = pool[i];
        pool[i] = pool[j];
        pool[j] = tmp;
    }

    let ga = 0, gb = 0;

    if (currentFunction === 'logistic') {
        // BCE gradient on the mini-batch
        for (let k = 0; k < batchSize; k++) {
            const idx = pool[k];
            const p = sigmoid(a * dataX[idx] + b);
            const diff = p - dataY[idx];
            ga += diff * dataX[idx];
            gb += diff;
        }
    } else if (currentFunction === 'svm') {
        // Hinge gradient on the mini-batch
        for (let k = 0; k < batchSize; k++) {
            const idx = pool[k];
            const margin = dataY[idx] * (a * dataX[idx] + b);
            if (margin < 1) {
                ga += -dataY[idx] * dataX[idx];
                gb += -dataY[idx];
            }
        }
    } else if (currentFunction === 'neuron') {
        // Neuron MSE gradient on the mini-batch
        for (let k = 0; k < batchSize; k++) {
            const idx = pool[k];
            const z = a * dataX[idx] + b;
            const s = sigmoid(z);
            const r = dataY[idx] - s;
            const ds = s * (1 - s);
            ga += -2 * r * ds * dataX[idx];
            gb += -2 * r * ds;
        }
    } else if (currentFunction === 'huber') {
        // Huber gradient on the mini-batch
        for (let k = 0; k < batchSize; k++) {
            const idx = pool[k];
            const r = dataY[idx] - a * dataX[idx] - b;
            let dr;
            if (r > HUBER_DELTA) dr = -HUBER_DELTA;
            else if (r < -HUBER_DELTA) dr = HUBER_DELTA;
            else dr = -r;
            ga += dr * dataX[idx];
            gb += dr;
        }
    } else {
        // MSE gradient on the mini-batch (linear, lasso, ridge)
        for (let k = 0; k < batchSize; k++) {
            const idx = pool[k];
            const r = dataY[idx] - a * dataX[idx] - b;
            ga += -2 * dataX[idx] * r;
            gb += -2 * r;
        }
    }
    ga /= batchSize;
    gb /= batchSize;

    // Add penalty gradient (regression only)
    if (currentFunction === 'lasso') {
        if (a > 1e-8) ga += lambda;
        else if (a < -1e-8) ga -= lambda;
    } else if (currentFunction === 'ridge') {
        ga += 2 * lambda * a;
    }
    return { gx: ga, gy: gb };
};

// ============ CONTOUR SETTINGS ============

function getContourStep() {
    const func = testFunctions[currentFunction];
    return func.contourStep || 3;
}

// ============ STATE ============

let state = {
    a: 0,
    b: 0,
    steps: 0,
    minF: Infinity,
    history: [],
    globalBounds: { xMin: -2, xMax: 6, yMin: -3, yMax: 5 }
    // x-axis = a (slope), y-axis = b (intercept)
};

// ============ DOM ELEMENTS ============

const els = {
    stepsVal: document.getElementById('steps-val'),
    currentFVal: document.getElementById('current-f-val'),
    minFVal: document.getElementById('min-f-val'),
    posA: document.getElementById('pos-a'),
    posB: document.getElementById('pos-b'),
    mseVal: document.getElementById('mse-val'),
    l1Val: document.getElementById('l1-val'),

    overlay: document.getElementById('overlay-canvas'),

    hoverStepSize: document.getElementById('hover-step-size'),
    hoverDa: document.getElementById('hover-da'),
    hoverDb: document.getElementById('hover-db'),

    btnRestart: document.getElementById('btn-restart'),
    btnNewData: document.getElementById('btn-new-data'),
    btnReveal: document.getElementById('btn-reveal'),
    radiusSlider: document.getElementById('radius-slider'),
    radiusValue: document.getElementById('radius-value'),

    // Win banner
    winBanner: document.getElementById('win-banner'),
    bannerMessage: document.getElementById('banner-message'),
    btnNewGame: document.getElementById('btn-new-game'),

    // Auto GD controls
    gdToggle: document.getElementById('gd-toggle'),
    methodSelect: document.getElementById('method-select'),
    lrSlider: document.getElementById('lr-slider'),
    lrValue: document.getElementById('lr-value'),
    betaSlider: document.getElementById('beta-slider'),
    betaValue: document.getElementById('beta-value'),
    momentumRow: document.getElementById('momentum-row'),
    gdSteps: document.getElementById('gd-steps'),
    gdFinal: document.getElementById('gd-final'),

    // Data controls
    sigmaSlider: document.getElementById('sigma-slider'),
    sigmaValue: document.getElementById('sigma-value'),
    lambdaSlider: document.getElementById('lambda-slider'),
    lambdaValue: document.getElementById('lambda-value'),
    npointsSlider: document.getElementById('npoints-slider'),
    npointsValue: document.getElementById('npoints-value'),
    batchSizeSlider: document.getElementById('batch-size-slider'),
    batchSizeValue: document.getElementById('batch-size-value'),

    functionDesc: document.getElementById('function-desc'),

    // Function selector & sections
    functionSelect: document.getElementById('function-select'),
    dataSection: document.getElementById('data-section'),
    headerSubtitle: document.getElementById('header-subtitle'),

    // Dynamic info bar labels
    labelX: document.getElementById('label-x'),
    labelY: document.getElementById('label-y'),
    labelC: document.getElementById('label-c'),
    labelD: document.getElementById('label-d'),
    labelDx: document.getElementById('label-dx'),
    labelDy: document.getElementById('label-dy'),
    footerText: document.getElementById('footer-text'),

    // Colormap
    colormapSelect: document.getElementById('colormap-select'),

    // Pac-Man
    pacmanToggle: document.getElementById('pacman-toggle'),
    pacmanSpeedSlider: document.getElementById('pacman-speed-slider'),
    pacmanSpeedValue: document.getElementById('pacman-speed-value'),
    pacmanSpeedRow: document.getElementById('pacman-speed-row')
};

// Canvas dimensions
const WIDTH = 600;
const HEIGHT = 600;

// Overlay canvas context (HiDPI-scaled)
const dpr = window.devicePixelRatio || 1;
els.overlay.width = WIDTH * dpr;
els.overlay.height = HEIGHT * dpr;
els.overlay.style.width = WIDTH + 'px';
els.overlay.style.height = HEIGHT + 'px';
const ctxOver = els.overlay.getContext('2d');
ctxOver.scale(dpr, dpr);

let hoverPos = null;
let mapRevealed = false;
let hasWon = false;
let isDragging = false;

// Pac-Man monster state
let monsterMode = true;
let monster = { a: 0, b: 0, history: [] };
let monsterSpeed = 0.3;
const MONSTER_CATCH_DISTANCE = 0.3;

// ============ D3 VARIABLES ============

let svg = null;
let defs = null;
let trueMapGroup = null;
let spotlightGroup = null;
let gdPathGroup = null;
let trajectoryGroup = null;

let spotlightRadius = 0.6;
const showShading = true;
let colormapMode = 'clamped';

// Auto GD state
let showGDPath = false;
let gdMethod = 'adam';
let learningRate = 0.05;
let beta = 0.9;
let beta2 = 0.999;
let epsilon = 1e-8;
let gdPath = [];
let initialPosition = { a: 0, b: 0 };
let colormapUserSet = false;

// ============ HELPERS ============

const formatNum = (num) => num.toFixed(3);

const getGlobalCanvasCoords = (a, b) => {
    const { xMin, xMax, yMin, yMax } = state.globalBounds;
    const cx = ((a - xMin) / (xMax - xMin)) * WIDTH;
    const cy = HEIGHT - ((b - yMin) / (yMax - yMin)) * HEIGHT;
    return { cx, cy };
};

// ============ COLOR FUNCTIONS ============

// Viewport value range (set by buildD3Map)
let colorMin = 0;
let colorMax = 100;

// HSV to RGB helper
const hsvToRgb = (h, s, v) => {
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);
    let r, g, b;
    switch (i % 6) {
        case 0: r = v; g = t; b = p; break;
        case 1: r = q; g = v; b = p; break;
        case 2: r = p; g = v; b = t; break;
        case 3: r = p; g = q; b = v; break;
        case 4: r = t; g = p; b = v; break;
        case 5: r = v; g = p; b = q; break;
    }
    return [Math.floor(r * 255), Math.floor(g * 255), Math.floor(b * 255)];
};

// Twilight colormap (perceptually uniform cyclic)
const twilightColor = (t) => {
    const colors = [
        [14, 15, 50], [80, 40, 100], [170, 90, 130],
        [230, 200, 200], [200, 140, 100], [140, 70, 50], [14, 15, 50]
    ];
    const positions = [0, 0.2, 0.4, 0.5, 0.6, 0.8, 1.0];
    let i = 0;
    while (i < positions.length - 1 && t > positions[i + 1]) i++;
    const t0 = positions[i], t1 = positions[i + 1];
    const frac = (t - t0) / (t1 - t0);
    const c0 = colors[i], c1 = colors[i + 1];
    return [
        Math.floor(c0[0] + frac * (c1[0] - c0[0])),
        Math.floor(c0[1] + frac * (c1[1] - c0[1])),
        Math.floor(c0[2] + frac * (c1[2] - c0[2]))
    ];
};

// Blue-green teal gradient from fraction
const tealFromFrac = (frac) => {
    const r = Math.floor(10 + frac * 40);
    const g = Math.floor(25 + frac * 155);
    const b = Math.floor(35 + frac * 185);
    return `rgb(${r}, ${g}, ${b})`;
};

const getContourColor = (level) => {
    const range = colorMax - colorMin;
    const linearFrac = range > 0 ? Math.max(0, Math.min(1, (level - colorMin) / range)) : 0;
    const NUM_BANDS = 10;  // number of bands for cyclic modes
    let frac;

    switch (colormapMode) {
        case 'cyclic':
            frac = (linearFrac * NUM_BANDS) % 1;
            return tealFromFrac(frac);

        case 'twilight': {
            frac = (linearFrac * NUM_BANDS) % 1;
            const [rt, gt, bt] = twilightColor(frac);
            return `rgb(${rt}, ${gt}, ${bt})`;
        }
        case 'hsv': {
            frac = (linearFrac * NUM_BANDS) % 1;
            const [rh, gh, bh] = hsvToRgb(frac, 0.7, 0.8);
            return `rgb(${rh}, ${gh}, ${bh})`;
        }
        case 'log':
            frac = range > 0 ? Math.log(1 + level - colorMin) / Math.log(1 + range) : 0;
            frac = Math.max(0, Math.min(1, frac));
            return tealFromFrac(frac);

        case 'sqrt':
            frac = range > 0 ? Math.sqrt(Math.max(0, level - colorMin)) / Math.sqrt(range) : 0;
            frac = Math.max(0, Math.min(1, frac));
            return tealFromFrac(frac);

        case 'clamped':
        default:
            return tealFromFrac(linearFrac);
    }
};

const getSpotlightColor = (relativeOffset, maxOffset) => {
    const normalized = maxOffset > 0 ? Math.max(-1, Math.min(1, relativeOffset / maxOffset)) : 0;
    const brightness = 0.5 - normalized * 0.4;
    const r = Math.floor(10 + brightness * 60);
    const g = Math.floor(30 + brightness * 160);
    const b = Math.floor(40 + brightness * 180);
    return `rgb(${r}, ${g}, ${b})`;
};

// ============ SCATTER PLOT ============

let scatterSvg = null;
let scatterG = null;
let scatterXScale = null;
let scatterYScale = null;
let scatterFitLine = null;   // line for regression, path for classification
let scatterFitPath = null;   // classification sigmoid path

function sigmoidCurvePath(a, b, xScale, yScale, steps) {
    const pts = [];
    for (let i = 0; i <= steps; i++) {
        const x = -6 + (12 * i / steps);
        const y = sigmoid(a * x + b);
        pts.push([xScale(x), yScale(y)]);
    }
    return 'M' + pts.map(p => p[0] + ',' + p[1]).join('L');
}

function buildScatterPlot() {
    const container = d3.select('#scatter-container');
    container.selectAll('*').remove();
    scatterFitLine = null;
    scatterFitPath = null;

    if (!usesData()) return;

    const classif = isClassification();
    const neuron = isNeuron();
    const isSvm = currentFunction === 'svm';
    const margin = { top: 10, right: 15, bottom: 28, left: 42 };
    const containerNode = container.node();
    const W = containerNode ? containerNode.clientWidth || 600 : 600;
    const H = Math.max(120, Math.round(W * 0.3));
    const pW = W - margin.left - margin.right;
    const pH = H - margin.top - margin.bottom;

    scatterSvg = container.append('svg')
        .attr('width', W)
        .attr('height', H)
        .style('background', '#050810');

    scatterG = scatterSvg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // X scale (fixed)
    scatterXScale = d3.scaleLinear().domain([-6, 6]).range([0, pW]);

    if (isSvm) {
        // Y scale fixed for {-1, +1} labels
        scatterYScale = d3.scaleLinear().domain([-1.3, 1.3]).range([pH, 0]);
    } else if (classif || neuron) {
        // Y scale fixed [−0.15, 1.15] for probability / sigmoid output
        scatterYScale = d3.scaleLinear().domain([-0.15, 1.15]).range([pH, 0]);
    } else {
        // Y scale (dynamic from data + lines)
        let yLo = Infinity, yHi = -Infinity;
        for (let i = 0; i < dataX.length; i++) {
            if (dataY[i] < yLo) yLo = dataY[i];
            if (dataY[i] > yHi) yHi = dataY[i];
        }
        for (const xb of [-6, 6]) {
            const yt = trueA * xb + trueB;
            const yf = state.a * xb + state.b;
            yLo = Math.min(yLo, yt, yf);
            yHi = Math.max(yHi, yt, yf);
        }
        const yPad = Math.max((yHi - yLo) * 0.15, 2);
        scatterYScale = d3.scaleLinear().domain([yLo - yPad, yHi + yPad]).range([pH, 0]);
    }

    // Axes
    scatterG.append('g')
        .attr('transform', `translate(0,${pH})`)
        .call(d3.axisBottom(scatterXScale).ticks(6));

    scatterG.append('g')
        .call(d3.axisLeft(scatterYScale).ticks(classif || neuron ? 3 : 5));

    // Axis labels
    scatterG.append('text')
        .attr('x', pW / 2).attr('y', pH + 24)
        .attr('text-anchor', 'middle')
        .attr('fill', 'rgba(255,255,255,0.35)')
        .attr('font-size', '10px')
        .text('x');

    scatterG.append('text')
        .attr('x', -pH / 2).attr('y', -30)
        .attr('text-anchor', 'middle')
        .attr('transform', 'rotate(-90)')
        .attr('fill', 'rgba(255,255,255,0.35)')
        .attr('font-size', '10px')
        .text(isSvm ? 'class' : (classif ? 'P(y=1)' : 'y'));

    if (isSvm) {
        // Decision boundary line (gold, vertical at x = -b/a)
        const bx = Math.abs(state.a) > 1e-8 ? -state.b / state.a : 999;
        scatterFitLine = scatterG.append('line')
            .attr('x1', scatterXScale(bx))
            .attr('y1', scatterYScale(-1.3))
            .attr('x2', scatterXScale(bx))
            .attr('y2', scatterYScale(1.3))
            .attr('stroke', '#ffd866')
            .attr('stroke-width', 2.5);

        // True boundary (dashed gray)
        const trueBx = Math.abs(trueA) > 1e-8 ? -trueB / trueA : 999;
        scatterG.append('line')
            .attr('x1', scatterXScale(trueBx))
            .attr('y1', scatterYScale(-1.3))
            .attr('x2', scatterXScale(trueBx))
            .attr('y2', scatterYScale(1.3))
            .attr('stroke', 'rgba(255,255,255,0.35)')
            .attr('stroke-width', 1.5)
            .attr('stroke-dasharray', '6,4');

        // Data points colored by class with jitter
        scatterG.selectAll('.data-pt')
            .data(dataX.map((xi, i) => ({ x: xi, y: dataY[i] })))
            .enter().append('circle')
            .attr('class', 'data-pt')
            .attr('cx', d => scatterXScale(d.x))
            .attr('cy', d => scatterYScale(d.y + (Math.random() - 0.5) * 0.15))
            .attr('r', 4)
            .attr('fill', d => d.y === 1 ? '#ff6b6b' : '#58a6ff')
            .attr('opacity', 0.85);

        // Legend
        const legX = pW - 130, legY = 4;
        scatterG.append('circle').attr('cx', legX + 5).attr('cy', legY + 5).attr('r', 4).attr('fill', '#ff6b6b');
        scatterG.append('text').attr('x', legX + 14).attr('y', legY + 9)
            .attr('fill', 'rgba(255,255,255,0.45)').attr('font-size', '9px').text('y = +1');
        scatterG.append('circle').attr('cx', legX + 55).attr('cy', legY + 5).attr('r', 4).attr('fill', '#58a6ff');
        scatterG.append('text').attr('x', legX + 64).attr('y', legY + 9)
            .attr('fill', 'rgba(255,255,255,0.45)').attr('font-size', '9px').text('y = \u22121');

    } else if (classif || neuron) {
        // True sigmoid curve (dashed gray)
        scatterG.append('path')
            .attr('d', sigmoidCurvePath(trueA, trueB, scatterXScale, scatterYScale, 80))
            .attr('fill', 'none')
            .attr('stroke', 'rgba(255,255,255,0.35)')
            .attr('stroke-width', 1.5)
            .attr('stroke-dasharray', '6,4');

        // Current fit sigmoid (gold)
        scatterFitPath = scatterG.append('path')
            .attr('d', sigmoidCurvePath(state.a, state.b, scatterXScale, scatterYScale, 80))
            .attr('fill', 'none')
            .attr('stroke', '#ffd866')
            .attr('stroke-width', 2.5);

        // Data points
        scatterG.selectAll('.data-pt')
            .data(dataX.map((xi, i) => ({ x: xi, y: dataY[i] })))
            .enter().append('circle')
            .attr('class', 'data-pt')
            .attr('cx', d => scatterXScale(d.x))
            .attr('cy', d => scatterYScale(classif ? d.y + (Math.random() - 0.5) * 0.08 : d.y))
            .attr('r', 4)
            .attr('fill', d => classif ? (d.y === 1 ? '#ff6b6b' : '#58a6ff') : '#58a6ff')
            .attr('opacity', 0.85);

        // Legend
        if (classif) {
            const legX = pW - 130, legY = 4;
            scatterG.append('circle').attr('cx', legX + 5).attr('cy', legY + 5).attr('r', 4).attr('fill', '#ff6b6b');
            scatterG.append('text').attr('x', legX + 14).attr('y', legY + 9)
                .attr('fill', 'rgba(255,255,255,0.45)').attr('font-size', '9px').text('y = 1');
            scatterG.append('circle').attr('cx', legX + 50).attr('cy', legY + 5).attr('r', 4).attr('fill', '#58a6ff');
            scatterG.append('text').attr('x', legX + 59).attr('y', legY + 9)
                .attr('fill', 'rgba(255,255,255,0.45)').attr('font-size', '9px').text('y = 0');
        }
    } else {
        // True line (dashed gray)
        scatterG.append('line')
            .attr('x1', scatterXScale(-6))
            .attr('y1', scatterYScale(trueA * -6 + trueB))
            .attr('x2', scatterXScale(6))
            .attr('y2', scatterYScale(trueA * 6 + trueB))
            .attr('stroke', 'rgba(255,255,255,0.35)')
            .attr('stroke-width', 1.5)
            .attr('stroke-dasharray', '6,4');

        // Current fit line (gold)
        scatterFitLine = scatterG.append('line')
            .attr('x1', scatterXScale(-6))
            .attr('y1', scatterYScale(state.a * -6 + state.b))
            .attr('x2', scatterXScale(6))
            .attr('y2', scatterYScale(state.a * 6 + state.b))
            .attr('stroke', '#ffd866')
            .attr('stroke-width', 2.5);

        // Data points
        scatterG.selectAll('.data-pt')
            .data(dataX.map((xi, i) => ({ x: xi, y: dataY[i] })))
            .enter().append('circle')
            .attr('class', 'data-pt')
            .attr('cx', d => scatterXScale(d.x))
            .attr('cy', d => scatterYScale(d.y))
            .attr('r', 4)
            .attr('fill', '#58a6ff')
            .attr('opacity', 0.85);

        // Legend
        const legX = pW - 150, legY = 4;
        scatterG.append('line')
            .attr('x1', legX).attr('y1', legY + 5)
            .attr('x2', legX + 18).attr('y2', legY + 5)
            .attr('stroke', 'rgba(255,255,255,0.35)')
            .attr('stroke-width', 1.5)
            .attr('stroke-dasharray', '5,3');
        scatterG.append('text')
            .attr('x', legX + 22).attr('y', legY + 9)
            .attr('fill', 'rgba(255,255,255,0.45)')
            .attr('font-size', '9px')
            .text(`True: y = ${trueA.toFixed(1)}x + ${trueB.toFixed(1)}`);
        scatterG.append('line')
            .attr('x1', legX).attr('y1', legY + 20)
            .attr('x2', legX + 18).attr('y2', legY + 20)
            .attr('stroke', '#ffd866')
            .attr('stroke-width', 2);
        scatterG.append('text')
            .attr('x', legX + 22).attr('y', legY + 24)
            .attr('fill', '#ffd866')
            .attr('font-size', '9px')
            .text('Your fit');
    }
}

function updateScatterFitLine() {
    // SVM: update vertical decision boundary
    if (currentFunction === 'svm') {
        if (!scatterFitLine || !scatterXScale) return;
        const bx = Math.abs(state.a) > 1e-8 ? -state.b / state.a : 999;
        scatterFitLine
            .attr('x1', scatterXScale(bx))
            .attr('x2', scatterXScale(bx));
        return;
    }
    // Logistic & Neuron: update sigmoid path
    if (isClassification() || isNeuron()) {
        if (!scatterFitPath || !scatterXScale || !scatterYScale) return;
        scatterFitPath.attr('d', sigmoidCurvePath(state.a, state.b, scatterXScale, scatterYScale, 80));
        return;
    }
    if (!isRegression()) return;
    if (!scatterFitLine || !scatterYScale) return;
    // Recompute Y scale to include current fit
    let yLo = Infinity, yHi = -Infinity;
    for (let i = 0; i < dataX.length; i++) {
        if (dataY[i] < yLo) yLo = dataY[i];
        if (dataY[i] > yHi) yHi = dataY[i];
    }
    for (const xb of [-6, 6]) {
        const yt = trueA * xb + trueB;
        const yf = state.a * xb + state.b;
        yLo = Math.min(yLo, yt, yf);
        yHi = Math.max(yHi, yt, yf);
    }
    const yPad = Math.max((yHi - yLo) * 0.15, 2);
    const newDomain = [yLo - yPad, yHi + yPad];

    // Only rebuild if domain changed significantly (avoids flicker)
    const oldDomain = scatterYScale.domain();
    if (Math.abs(newDomain[0] - oldDomain[0]) > 0.5 || Math.abs(newDomain[1] - oldDomain[1]) > 0.5) {
        buildScatterPlot();
        return;
    }

    scatterFitLine
        .attr('y1', scatterYScale(state.a * -6 + state.b))
        .attr('y2', scatterYScale(state.a * 6 + state.b));
}

// ============ D3 MAP ============

function buildD3Map() {
    const container = d3.select('#svg-container');
    container.selectAll('*').remove();

    const n = 150;
    const m = 150;
    const { xMin, xMax, yMin, yMax } = state.globalBounds;

    const values = new Array(n * m);
    for (let j = 0; j < m; ++j) {
        const vb = yMin + ((m - 1 - j) / (m - 1)) * (yMax - yMin);
        for (let i = 0; i < n; ++i) {
            const va = xMin + (i / (n - 1)) * (xMax - xMin);
            values[j * n + i] = f(va, vb);
        }
    }

    svg = container.append('svg')
        .attr('width', WIDTH)
        .attr('height', HEIGHT)
        .style('background', '#0b1120');

    defs = svg.append('defs');

    svg.append('rect')
        .attr('width', WIDTH)
        .attr('height', HEIGHT)
        .attr('fill', '#050810');

    // True map group (preserve revealed state)
    const mapScale = WIDTH / (n - 1);
    trueMapGroup = svg.append('g')
        .attr('class', 'true-map')
        .attr('transform', `scale(${mapScale}, ${mapScale})`)
        .style('opacity', mapRevealed ? 1 : 0);

    // Compute grid min/max for viewport-adaptive colormap
    let gridMin = Infinity, gridMax = -Infinity;
    for (let k = 0; k < values.length; k++) {
        if (values[k] < gridMin) gridMin = values[k];
        if (values[k] > gridMax) gridMax = values[k];
    }
    colorMin = gridMin;
    colorMax = gridMax;

    const step = getContourStep();
    const thresholdStart = Math.floor(gridMin / step) * step;
    // Cap at ~150 contour levels to avoid performance issues on high-range functions
    const maxThresholds = 150;
    const thresholdEnd = Math.min(
        Math.ceil(gridMax / step) * step,
        thresholdStart + maxThresholds * step
    );
    const thresholds = d3.range(thresholdStart, thresholdEnd + step, step);
    const contours = d3.contours()
        .size([n, m])
        .thresholds(thresholds)
        (values);

    trueMapGroup.selectAll('path')
        .data(contours)
        .enter().append('path')
        .attr('d', d3.geoPath())
        .attr('fill', d => getContourColor(d.value))
        .attr('stroke', '#060c18')
        .attr('stroke-width', 0.1)
        .attr('stroke-linejoin', 'round');

    // Axis labels on the map
    const xLabel = usesData() ? 'a \u2192' : 'X \u2192';
    const yLabel = usesData() ? '\u2191 b' : '\u2191 Y';
    const labelGroup = svg.append('g').attr('class', 'axis-labels');
    labelGroup.append('text')
        .attr('x', WIDTH - 20).attr('y', HEIGHT - 8)
        .attr('fill', 'rgba(255,255,255,0.3)')
        .attr('font-size', '12px')
        .attr('text-anchor', 'end')
        .text(xLabel);
    labelGroup.append('text')
        .attr('x', 8).attr('y', 16)
        .attr('fill', 'rgba(255,255,255,0.3)')
        .attr('font-size', '12px')
        .text(yLabel);
    // Corner labels
    labelGroup.append('text')
        .attr('x', 4).attr('y', HEIGHT - 4)
        .attr('fill', 'rgba(255,255,255,0.2)')
        .attr('font-size', '9px')
        .text(`(${xMin},${yMin})`);
    labelGroup.append('text')
        .attr('x', WIDTH - 4).attr('y', 14)
        .attr('fill', 'rgba(255,255,255,0.2)')
        .attr('font-size', '9px')
        .attr('text-anchor', 'end')
        .text(`(${xMax},${yMax})`);

    // Spotlight group
    spotlightGroup = svg.append('g').attr('class', 'spotlights');

    // GD path group
    gdPathGroup = svg.append('g').attr('class', 'gd-path');

    // Trajectory group
    trajectoryGroup = svg.append('g').attr('class', 'trajectory');
}

// ============ INIT ============

function init() {
    parseDemo();
    if (activeDemo) {
        loadPreset(activeDemo);
        // Disable "New Data" button in demo mode
        els.btnNewData.disabled = true;
        els.btnNewData.style.opacity = '0.4';
        els.btnNewData.title = 'Disabled in demo mode';
    } else {
        randomStart();
    }

    els.overlay.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    els.btnRestart.addEventListener('click', randomStart);
    els.btnNewGame.addEventListener('click', randomStart);

    els.btnNewData.addEventListener('click', () => {
        if (activeDemo) return;
        regenerateData();
        rebuildLandscape();
    });

    // Function selector — changing function exits demo mode
    els.functionSelect.addEventListener('change', (e) => {
        currentFunction = e.target.value;
        if (activeDemo) {
            activeDemo = null;
            els.btnNewData.disabled = false;
            els.btnNewData.style.opacity = '';
            els.btnNewData.title = '';
        }
        randomStart();
    });

    els.btnReveal.addEventListener('click', () => {
        mapRevealed = true;
        trueMapGroup.transition().duration(800).style('opacity', 1);
        redraw();
    });

    // Colormap selector
    els.colormapSelect.addEventListener('change', (e) => {
        colormapMode = e.target.value;
        colormapUserSet = true;
        buildD3Map();
        redraw();
        if (typeof update3DColors === 'function') update3DColors();
    });

    els.radiusSlider.addEventListener('input', (e) => {
        spotlightRadius = parseFloat(e.target.value);
        els.radiusValue.textContent = spotlightRadius.toFixed(1);
        redraw();
    });

    // Data noise slider
    els.sigmaSlider.addEventListener('input', (e) => {
        noiseSigma = parseFloat(e.target.value);
        els.sigmaValue.textContent = noiseSigma.toFixed(1);
        if (!isClassification()) {
            regenerateData();
            rebuildLandscape();
        }
    });

    // Lambda slider
    els.lambdaSlider.addEventListener('input', (e) => {
        lambda = parseFloat(e.target.value);
        els.lambdaValue.textContent = lambda.toFixed(1);
        updateFunctionDesc();
        rebuildLandscape();
    });

    // Number of points slider
    els.npointsSlider.addEventListener('input', (e) => {
        nPoints = parseInt(e.target.value);
        els.npointsValue.textContent = nPoints;
        // Clamp batch size to nPoints and update slider max
        els.batchSizeSlider.max = nPoints;
        if (batchSize > nPoints) {
            batchSize = nPoints;
            els.batchSizeSlider.value = batchSize;
            els.batchSizeValue.textContent = batchSize;
        }
        regenerateData();
        rebuildLandscape();
    });

    // Auto GD controls
    els.gdToggle.addEventListener('change', (e) => {
        showGDPath = e.target.checked;
        if (showGDPath) computeGDPath();
        redraw();
    });

    els.lrSlider.addEventListener('input', (e) => {
        learningRate = parseFloat(e.target.value);
        els.lrValue.textContent = learningRate.toFixed(3);
        if (showGDPath) { computeGDPath(); redraw(); }
    });

    els.methodSelect.addEventListener('change', (e) => {
        gdMethod = e.target.value;
        updateMomentumVisibility();
        if (showGDPath) { computeGDPath(); redraw(); }
    });

    els.betaSlider.addEventListener('input', (e) => {
        beta = parseFloat(e.target.value);
        els.betaValue.textContent = beta.toFixed(2);
        if (showGDPath) { computeGDPath(); redraw(); }
    });

    els.batchSizeSlider.addEventListener('input', (e) => {
        batchSize = parseInt(e.target.value);
        els.batchSizeValue.textContent = batchSize;
        if (state.history.length > 0) {
            const current = state.history[state.history.length - 1];
            const newGrad = gradient(current.a, current.b);
            current.gx = newGrad.gx;
            current.gy = newGrad.gy;
        }
        if (showGDPath) computeGDPath();
        redraw();
    });

    // Pac-Man controls
    els.pacmanToggle.addEventListener('change', (e) => {
        monsterMode = e.target.checked;
        els.pacmanSpeedRow.style.display = monsterMode ? 'flex' : 'none';
        if (monsterMode) {
            randomStart();
        } else {
            // Reveal map when turning off
            mapRevealed = true;
            trueMapGroup.transition().duration(800).style('opacity', 1);
            monster.history = [];
            redraw();
        }
    });

    els.pacmanSpeedSlider.addEventListener('input', (e) => {
        monsterSpeed = parseFloat(e.target.value);
        els.pacmanSpeedValue.textContent = monsterSpeed.toFixed(2);
    });

    updateMomentumVisibility();
    // Set batch size slider max to match initial nPoints
    els.batchSizeSlider.max = nPoints;
    updateFunctionDesc();

    // Sync Pac-Man UI with monsterMode (may have been set by URL param)
    els.pacmanToggle.checked = monsterMode;
    els.pacmanSpeedRow.style.display = monsterMode ? 'flex' : 'none';

    // Sync optimizer UI (may have been set by URL param)
    els.methodSelect.value = gdMethod;
    updateMomentumVisibility();

    // Sync batch size UI (may have been set by URL param)
    if (batchSize <= nPoints) {
        els.batchSizeSlider.value = batchSize;
        els.batchSizeValue.textContent = batchSize;
    }

    // Sync learning rate UI (may have been set by URL param)
    els.lrSlider.value = learningRate;
    els.lrValue.textContent = learningRate.toFixed(3);
}

function updateFunctionDesc() {
    els.functionDesc.textContent = getDescription();
}

function updateMomentumVisibility() {
    const needsMomentum = ['momentum', 'nesterov', 'rmsprop', 'adam'].includes(gdMethod);
    els.momentumRow.style.display = needsMomentum ? 'flex' : 'none';
}

function updateUIForFunction() {
    const reg = isRegression();
    const classif = isClassification();
    const data = usesData();

    // Show/hide Data section
    els.dataSection.style.display = data ? '' : 'none';

    // Show/hide lambda slider (only for Lasso/Ridge)
    const lambdaRow = els.lambdaSlider.closest('.slider-row');
    lambdaRow.style.display = (currentFunction === 'lasso' || currentFunction === 'ridge') ? '' : 'none';

    // Show/hide sigma slider (not applicable for classification)
    const sigmaRow = els.sigmaSlider.closest('.slider-row');
    sigmaRow.style.display = classif ? 'none' : (data ? '' : 'none');

    // Update info bar labels
    const neuron = isNeuron();
    if (classif) {
        els.labelX.textContent = 'a (weight)';
        els.labelY.textContent = 'b (bias)';
        if (currentFunction === 'svm') {
            els.labelC.textContent = 'Hinge';
            els.labelD.textContent = 'Acc';
        } else {
            els.labelC.textContent = 'BCE';
            els.labelD.textContent = 'Acc';
        }
    } else if (neuron) {
        els.labelX.textContent = 'a (weight)';
        els.labelY.textContent = 'b (bias)';
        els.labelC.textContent = 'MSE';
        els.labelD.textContent = '--';
    } else if (reg) {
        els.labelX.textContent = 'a (slope)';
        els.labelY.textContent = 'b (intercept)';
        if (currentFunction === 'huber') {
            els.labelC.textContent = 'Huber';
        } else {
            els.labelC.textContent = 'MSE';
        }
        if (currentFunction === 'lasso') {
            els.labelD.innerHTML = '&lambda;|a|';
        } else if (currentFunction === 'ridge') {
            els.labelD.innerHTML = '&lambda;a&sup2;';
        } else {
            els.labelD.textContent = '--';
        }
    } else {
        els.labelX.textContent = 'X';
        els.labelY.textContent = 'Y';
        els.labelC.textContent = 'f(x,y)';
        els.labelD.innerHTML = '|&nabla;f|';
    }

    // Drag info labels
    els.labelDx.innerHTML = data ? '&Delta;a' : '&Delta;X';
    els.labelDy.innerHTML = data ? '&Delta;b' : '&Delta;Y';

    // Header subtitle
    if (classif) {
        els.headerSubtitle.textContent = 'Classify by navigating the loss surface';
    } else if (neuron) {
        els.headerSubtitle.textContent = 'Fit y = \u03C3(a\u00B7x + b) by navigating the loss surface';
    } else if (reg) {
        els.headerSubtitle.textContent = 'Fit y = a\u00B7x + b by navigating the loss surface';
    } else {
        els.headerSubtitle.textContent = 'Navigate to the global minimum';
    }

    // Footer text
    if (currentFunction === 'logistic') {
        els.footerText.innerHTML = 'Loss = &minus;(1/n)&Sigma;[y<sub>i</sub> log &sigma;(ax<sub>i</sub>+b) + (1&minus;y<sub>i</sub>) log(1&minus;&sigma;(ax<sub>i</sub>+b))] &mdash; Binary cross-entropy.';
    } else if (currentFunction === 'svm') {
        els.footerText.innerHTML = 'Loss = (1/n)&Sigma; max(0, 1 &minus; y<sub>i</sub>(ax<sub>i</sub>+b)) &mdash; Hinge loss for maximum-margin classification.';
    } else if (currentFunction === 'neuron') {
        els.footerText.innerHTML = 'Loss = (1/n)&Sigma;(y<sub>i</sub> &minus; &sigma;(ax<sub>i</sub>+b))&sup2; &mdash; Non-convex: a single neuron with sigmoid activation.';
    } else if (currentFunction === 'huber') {
        els.footerText.innerHTML = `Loss = (1/n)&Sigma; H<sub>&delta;</sub>(y<sub>i</sub> &minus; ax<sub>i</sub> &minus; b), &delta;=${HUBER_DELTA} &mdash; Robust to outliers: quadratic near zero, linear in tails.`;
    } else if (currentFunction === 'lasso') {
        els.footerText.innerHTML = 'Loss = (1/n)&Sigma;(y<sub>i</sub> &minus; a&middot;x<sub>i</sub> &minus; b)&sup2; + &lambda;&middot;|a| &mdash; The L1 penalty shrinks the slope toward zero.';
    } else if (currentFunction === 'ridge') {
        els.footerText.innerHTML = 'Loss = (1/n)&Sigma;(y<sub>i</sub> &minus; a&middot;x<sub>i</sub> &minus; b)&sup2; + &lambda;&middot;a&sup2; &mdash; The L2 penalty shrinks the slope smoothly.';
    } else if (currentFunction === 'linear') {
        els.footerText.innerHTML = 'Loss = (1/n)&Sigma;(y<sub>i</sub> &minus; a&middot;x<sub>i</sub> &minus; b)&sup2; &mdash; Ordinary least squares with no penalty.';
    } else if (currentFunction === 'maze') {
        els.footerText.innerHTML = 'f(x,y) = &Sigma; h<sub>i</sub>&middot;exp(&minus;||p &minus; c<sub>i</sub>||&sup2; / 2&sigma;<sub>i</sub>&sup2;) &mdash; Navigate narrow corridors where the gradient nearly vanishes.';
    } else {
        els.footerText.textContent = getDescription();
    }

    // Set default colormap only on function type change (not on New Game)
    const defaultCm = testFunctions[currentFunction].defaultColormap || 'clamped';
    if (colormapMode !== defaultCm && !colormapUserSet) {
        colormapMode = defaultCm;
        els.colormapSelect.value = defaultCm;
    }
}

// Rebuild landscape after data/lambda change (keep position)
function rebuildLandscape() {
    state.steps = 0;
    state.minF = Infinity;
    state.history = [];
    hasWon = false;
    initialPosition = { a: state.a, b: state.b };

    gdPath = [];
    els.gdSteps.textContent = '--';
    els.gdFinal.textContent = '--';

    els.winBanner.classList.add('hidden');
    updateFunctionDesc();
    buildD3Map();
    if (usesData()) buildScatterPlot();
    updateState();
    if (typeof rebuild3DPanel === 'function') rebuild3DPanel();
}

function randomizeBounds() {
    if (usesData()) {
        // Viewport is 8x8; place the optimum at a random position
        const viewW = 8, viewH = 8;
        const fracA = 0.2 + Math.random() * 0.6;
        const fracB = 0.2 + Math.random() * 0.6;
        state.globalBounds = {
            xMin: trueA - fracA * viewW,
            xMax: trueA + (1 - fracA) * viewW,
            yMin: trueB - fracB * viewH,
            yMax: trueB + (1 - fracB) * viewH
        };
    } else {
        const func = testFunctions[currentFunction];
        const nb = func.bounds;

        // Maze: use natural bounds directly (entire maze must be visible)
        if (currentFunction === 'maze') {
            state.globalBounds = { xMin: nb.xMin, xMax: nb.xMax, yMin: nb.yMin, yMax: nb.yMax };
            return;
        }

        const viewW = nb.xMax - nb.xMin;
        const viewH = nb.yMax - nb.yMin;

        // Find approximate minimum location
        let minX, minY;
        if (func.getMinimumHint) {
            const hint = func.getMinimumHint();
            minX = hint.x;
            minY = hint.y;
        } else {
            // Grid search over natural bounds (e.g. Himmelblau)
            let bestF = Infinity;
            minX = 0; minY = 0;
            const steps = 80;
            for (let i = 0; i <= steps; i++) {
                const x = nb.xMin + (i / steps) * viewW;
                for (let j = 0; j <= steps; j++) {
                    const y = nb.yMin + (j / steps) * viewH;
                    const val = f(x, y);
                    if (val < bestF) { bestF = val; minX = x; minY = y; }
                }
            }
        }

        // Place minimum at random position (20%-80%) within viewport
        const fracX = 0.2 + Math.random() * 0.6;
        const fracY = 0.2 + Math.random() * 0.6;
        state.globalBounds = {
            xMin: minX - fracX * viewW,
            xMax: minX + (1 - fracX) * viewW,
            yMin: minY - fracY * viewH,
            yMax: minY + (1 - fracY) * viewH
        };
    }
}

function randomStart() {
    // In demo mode, reload the preset instead of randomizing
    if (activeDemo) {
        loadPreset(activeDemo);
        return;
    }

    randomizeFuncParams();

    if (usesData()) regenerateData();
    if (usesData()) {
        // Clamp batch size to nPoints
        els.batchSizeSlider.max = nPoints;
        if (batchSize > nPoints) {
            batchSize = nPoints;
            els.batchSizeSlider.value = batchSize;
            els.batchSizeValue.textContent = batchSize;
        }
    }

    randomizeBounds();

    const bounds = state.globalBounds;
    const aRange = bounds.xMax - bounds.xMin;
    const bRange = bounds.yMax - bounds.yMin;

    // Pick starting point with highest loss, avoiding flat minima
    const fn = testFunctions[currentFunction];
    const K = 20;
    const winThresh = computeWinThreshold();
    let best = null;
    for (let attempt = 0; attempt < 3; attempt++) {
        for (let i = 0; i < K; i++) {
            const ca = bounds.xMin + 0.1 * aRange + Math.random() * 0.8 * aRange;
            const cb = bounds.yMin + 0.1 * bRange + Math.random() * 0.8 * bRange;
            const val = fn.f(ca, cb);
            if (!best || val > best.val) best = { a: ca, b: cb, val };
        }
        if (best.val > winThresh) break;
    }
    const chosen = best;
    state.a = chosen.a;
    state.b = chosen.b;
    state.steps = 0;
    state.minF = Infinity;
    state.history = [];
    mapRevealed = false;
    hasWon = false;

    initialPosition = { a: state.a, b: state.b };

    gdPath = [];
    els.gdSteps.textContent = '--';
    els.gdFinal.textContent = '--';

    els.winBanner.classList.add('hidden');
    els.winBanner.style.background = '';

    if (monsterMode) spawnMonster();

    updateUIForFunction();
    updateFunctionDesc();
    buildD3Map();

    if (usesData()) {
        buildScatterPlot();
    } else {
        d3.select('#scatter-container').selectAll('*').remove();
        scatterSvg = null;
        scatterFitLine = null;
        scatterFitPath = null;
    }

    updateState();
    if (typeof rebuild3DPanel === 'function') rebuild3DPanel();
}

// ============ UPDATE STATE ============

function updateState() {
    const val = f(state.a, state.b);
    const grad = gradient(state.a, state.b);
    if (val < state.minF) state.minF = val;

    state.history.push({
        a: state.a,
        b: state.b,
        f: val,
        gx: grad.gx,
        gy: grad.gy
    });

    els.stepsVal.textContent = state.steps;
    els.currentFVal.textContent = formatNum(val);
    els.minFVal.textContent = formatNum(state.minF);
    els.posA.textContent = formatNum(state.a);
    els.posB.textContent = formatNum(state.b);

    if (isClassification()) {
        els.mseVal.textContent = formatNum(val);
        // Compute accuracy
        let correct = 0;
        for (let i = 0; i < dataX.length; i++) {
            const score = state.a * dataX[i] + state.b;
            if (currentFunction === 'svm') {
                const pred = score >= 0 ? 1 : -1;
                if (pred === dataY[i]) correct++;
            } else {
                const pred = sigmoid(score) >= 0.5 ? 1 : 0;
                if (pred === dataY[i]) correct++;
            }
        }
        els.l1Val.textContent = (correct / dataX.length * 100).toFixed(0) + '%';
    } else if (isNeuron()) {
        els.mseVal.textContent = formatNum(val);
        els.l1Val.textContent = '--';
    } else if (isRegression()) {
        if (currentFunction === 'huber') {
            els.mseVal.textContent = formatNum(val);
        } else {
            els.mseVal.textContent = formatNum(mseComponent(state.a, state.b));
        }
        const func = testFunctions[currentFunction];
        els.l1Val.textContent = func.penalty ? formatNum(func.penalty(state.a)) : '--';
    } else {
        els.mseVal.textContent = formatNum(val);
        const gradMag = Math.sqrt(grad.gx * grad.gx + grad.gy * grad.gy);
        els.l1Val.textContent = formatNum(gradMag);
    }

    // Move monster after player moves (but not on initial placement)
    if (monsterMode && state.steps > 0) moveMonster();

    if (usesData()) updateScatterFitLine();
    redraw();
    saveStateFor3D();
    if (typeof update3DPath === 'function') update3DPath();

    // Monster catch check (before win check)
    if (monsterMode && checkMonsterCatch()) {
        setTimeout(() => {
            els.bannerMessage.innerHTML =
                `Waka waka! Eaten by Pac-Man! Best: f = <strong>${formatNum(state.minF)}</strong>. `;
            els.btnNewGame.textContent = 'Try Again';
            els.winBanner.style.background = 'linear-gradient(135deg, rgba(218, 54, 51, 0.95), rgba(180, 40, 40, 0.95))';
            els.winBanner.classList.remove('hidden');

            mapRevealed = true;
            trueMapGroup.transition().duration(800).style('opacity', 1);
            redraw();
        }, 100);
        return;
    }

    // Win condition: reach loss within 10% + 0.3 of grid minimum
    const winThreshold = computeWinThreshold();
    if (val < winThreshold && state.steps > 0 && !hasWon) {
        hasWon = true;
        setTimeout(() => {
            els.bannerMessage.innerHTML =
                `Minimum Found! Loss = <strong>${formatNum(val)}</strong> in ` +
                `<strong>${state.steps}</strong> steps. Keep exploring or `;
            els.btnNewGame.textContent = 'start over';
            els.winBanner.classList.remove('hidden');

            mapRevealed = true;
            trueMapGroup.transition().duration(800).style('opacity', 1);

            showGDPath = true;
            els.gdToggle.checked = true;
            computeGDPath();
            redraw();
        }, 100);
    }
}

function computeWinThreshold() {
    // Quick grid search for approximate minimum
    const { xMin, xMax, yMin, yMax } = state.globalBounds;
    let best = Infinity;
    const steps = 60;
    for (let i = 0; i <= steps; i++) {
        const a = xMin + (i / steps) * (xMax - xMin);
        for (let j = 0; j <= steps; j++) {
            const b = yMin + (j / steps) * (yMax - yMin);
            const loss = f(a, b);
            if (loss < best) best = loss;
        }
    }
    // Classification/neuron losses are small (bounded ~0–1), use tighter absolute slack
    const slack = (isClassification() || isNeuron()) ? 0.05 : 0.3;
    return best + Math.abs(best) * 0.1 + slack;
}

// ============ REDRAW ============

function redraw() {
    spotlightGroup.selectAll('*').remove();
    defs.selectAll('.spotlight-clip').remove();
    drawAllSpotlightsSVG();

    gdPathGroup.selectAll('*').remove();
    if (showGDPath && gdPath.length > 0) drawGDPathSVG();

    trajectoryGroup.selectAll('*').remove();
    drawTrajectorySVG();
    drawMonsterSVG();
}

// ============ SPOTLIGHTS (from V4) ============

function drawAllSpotlightsSVG() {
    // Use fixed reference span so spotlight looks consistent across all functions
    const REF_SPAN = 8;
    const rPx = (spotlightRadius / REF_SPAN) * WIDTH;

    for (let i = 0; i < state.history.length - 1; i++) {
        const pt = state.history[i];
        drawSingleSpotlightSVG(pt, i, rPx, 0.5, false);
    }

    if (state.history.length > 0) {
        const current = state.history[state.history.length - 1];
        drawSingleSpotlightSVG(current, state.history.length - 1, rPx, 1.0, true);
    }
}

function drawSingleSpotlightSVG(pt, index, rPx, opacity, showArrow) {
    const { xMin, xMax } = state.globalBounds;
    const span = xMax - xMin;

    const center = getGlobalCanvasCoords(pt.a, pt.b);
    const gradMag = Math.sqrt(pt.gx * pt.gx + pt.gy * pt.gy);

    const clipId = `spotlight-clip-${index}`;
    defs.append('clipPath')
        .attr('class', 'spotlight-clip')
        .attr('id', clipId)
        .append('circle')
        .attr('cx', center.cx)
        .attr('cy', center.cy)
        .attr('r', rPx);

    const g = spotlightGroup.append('g').attr('opacity', opacity);

    g.append('circle')
        .attr('cx', center.cx).attr('cy', center.cy).attr('r', rPx)
        .attr('fill', '#0a1628')
        .attr('fill-opacity', mapRevealed ? 0.5 : 1);

    if (gradMag < 0.001) {
        if (showShading) {
            g.append('circle')
                .attr('cx', center.cx).attr('cy', center.cy).attr('r', rPx)
                .attr('fill', getSpotlightColor(0, 1))
                .attr('fill-opacity', mapRevealed ? 0.5 : 1);
        }
        g.append('circle')
            .attr('cx', center.cx).attr('cy', center.cy).attr('r', rPx)
            .attr('fill', 'none')
            .attr('stroke', 'rgba(255, 255, 255, 0.5)')
            .attr('stroke-width', showArrow ? 2 : 1);
        return;
    }

    const ugx = pt.gx / gradMag;
    const ugy = pt.gy / gradMag;
    const perpX = -ugy;
    const perpY = ugx;

    const clippedG = g.append('g').attr('clip-path', `url(#${clipId})`);

    const gradPxX = (ugx / span) * WIDTH;
    const gradPxY = -(ugy / span) * HEIGHT;
    const gradPxMag = Math.sqrt(gradPxX * gradPxX + gradPxY * gradPxY);

    const perpPxX = (perpX / span) * WIDTH;
    const perpPxY = -(perpY / span) * HEIGHT;
    const perpLen = Math.sqrt(perpPxX * perpPxX + perpPxY * perpPxY);
    const normPerpX = (perpPxX / perpLen) * rPx * 2;
    const normPerpY = (perpPxY / perpLen) * rPx * 2;

    // Derive coordinate-space radius from pixel radius (consistent across functions)
    const step = getContourStep();
    const coordRadius = (rPx / WIDTH) * span;
    const maxDist = coordRadius * gradMag;
    const minLevel = Math.floor((pt.f - maxDist) / step) * step;
    const maxLevel = Math.ceil((pt.f + maxDist) / step) * step;

    // Use the same step as the full map — no density cap
    const levels = [];
    for (let level = minLevel; level <= maxLevel; level += step) {
        levels.push(level);
    }

    if (showShading) {
        const gradientId = `spotlight-gradient-${index}`;
        const normGradPxX = gradPxX / gradPxMag;
        const normGradPxY = gradPxY / gradPxMag;

        const x1 = center.cx - normGradPxX * rPx;
        const y1 = center.cy - normGradPxY * rPx;
        const x2 = center.cx + normGradPxX * rPx;
        const y2 = center.cy + normGradPxY * rPx;

        const svgGrad = defs.append('linearGradient')
            .attr('class', 'spotlight-clip')
            .attr('id', gradientId)
            .attr('gradientUnits', 'userSpaceOnUse')
            .attr('x1', x1).attr('y1', y1)
            .attr('x2', x2).attr('y2', y2);

        svgGrad.append('stop').attr('offset', '0%').attr('stop-color', 'rgb(10, 30, 40)');
        svgGrad.append('stop').attr('offset', '50%').attr('stop-color', 'rgb(28, 70, 85)');
        svgGrad.append('stop').attr('offset', '100%').attr('stop-color', 'rgb(46, 110, 130)');

        clippedG.append('circle')
            .attr('cx', center.cx).attr('cy', center.cy).attr('r', rPx)
            .attr('fill', `url(#${gradientId})`)
            .attr('fill-opacity', mapRevealed ? 0.5 : 1);
    }

    const lineColor = `rgba(255, 255, 255, ${0.3 * opacity})`;
    for (const level of levels) {
        const dist = (level - pt.f) / gradMag;
        const offsetX = gradPxX * dist;
        const offsetY = gradPxY * dist;

        clippedG.append('line')
            .attr('x1', center.cx + offsetX - normPerpX)
            .attr('y1', center.cy + offsetY - normPerpY)
            .attr('x2', center.cx + offsetX + normPerpX)
            .attr('y2', center.cy + offsetY + normPerpY)
            .attr('stroke', lineColor)
            .attr('stroke-width', 1);
    }

    if (showArrow) {
        // Arrow length proportional to spotlight radius for consistency
        const arrowDx = (gradPxX / gradPxMag) * rPx * 0.8;
        const arrowDy = (gradPxY / gradPxMag) * rPx * 0.8;
        const angle = Math.atan2(arrowDy, arrowDx);
        const arrowHeadLen = 10;

        g.append('line')
            .attr('x1', center.cx).attr('y1', center.cy)
            .attr('x2', center.cx + arrowDx).attr('y2', center.cy + arrowDy)
            .attr('stroke', '#ff6b6b')
            .attr('stroke-width', 3)
            .attr('stroke-linecap', 'round');

        const headPath = `M ${center.cx + arrowDx} ${center.cy + arrowDy}
            L ${center.cx + arrowDx - arrowHeadLen * Math.cos(angle - Math.PI / 6)} ${center.cy + arrowDy - arrowHeadLen * Math.sin(angle - Math.PI / 6)}
            M ${center.cx + arrowDx} ${center.cy + arrowDy}
            L ${center.cx + arrowDx - arrowHeadLen * Math.cos(angle + Math.PI / 6)} ${center.cy + arrowDy - arrowHeadLen * Math.sin(angle + Math.PI / 6)}`;

        g.append('path')
            .attr('d', headPath)
            .attr('stroke', '#ff6b6b')
            .attr('stroke-width', 3)
            .attr('stroke-linecap', 'round')
            .attr('fill', 'none');
    }

    g.append('circle')
        .attr('cx', center.cx).attr('cy', center.cy).attr('r', rPx)
        .attr('fill', 'none')
        .attr('stroke', showArrow ? 'rgba(255, 255, 255, 0.7)' : 'rgba(255, 255, 255, 0.3)')
        .attr('stroke-width', showArrow ? 2 : 1);
}

// ============ GD PATH (from V4, adapted) ============

function computeGDPath() {
    gdPath = [];
    let a = initialPosition.a;
    let b = initialPosition.b;
    const maxSteps = 1000;
    const tolerance = 1e-6;

    let va = 0, vb = 0;
    let sa = 0, sb = 0;
    let ma = 0, mb = 0;

    for (let t = 1; t <= maxSteps; t++) {
        const val = f(a, b);
        gdPath.push({ a, b, f: val });

        const bounds = state.globalBounds;
        let grad;
        if (gdMethod === 'nesterov') {
            const lookA = Math.max(bounds.xMin, Math.min(bounds.xMax, a - learningRate * beta * va));
            const lookB = Math.max(bounds.yMin, Math.min(bounds.yMax, b - learningRate * beta * vb));
            grad = gradient(lookA, lookB);
        } else {
            grad = gradient(a, b);
        }

        let gradMag = Math.sqrt(grad.gx * grad.gx + grad.gy * grad.gy);
        if (gradMag < tolerance) break;

        const maxGrad = 100;
        if (gradMag > maxGrad) {
            grad.gx = (grad.gx / gradMag) * maxGrad;
            grad.gy = (grad.gy / gradMag) * maxGrad;
            gradMag = maxGrad;
        }

        let da, db;

        switch (gdMethod) {
            case 'vanilla':
                da = learningRate * grad.gx;
                db = learningRate * grad.gy;
                break;
            case 'momentum':
                va = beta * va + (1 - beta) * grad.gx;
                vb = beta * vb + (1 - beta) * grad.gy;
                da = learningRate * va;
                db = learningRate * vb;
                break;
            case 'nesterov':
                va = beta * va + (1 - beta) * grad.gx;
                vb = beta * vb + (1 - beta) * grad.gy;
                da = learningRate * va;
                db = learningRate * vb;
                break;
            case 'rmsprop':
                sa = beta * sa + (1 - beta) * grad.gx * grad.gx;
                sb = beta * sb + (1 - beta) * grad.gy * grad.gy;
                da = learningRate * grad.gx / (Math.sqrt(sa) + epsilon);
                db = learningRate * grad.gy / (Math.sqrt(sb) + epsilon);
                break;
            case 'adam':
                ma = beta * ma + (1 - beta) * grad.gx;
                mb = beta * mb + (1 - beta) * grad.gy;
                sa = beta2 * sa + (1 - beta2) * grad.gx * grad.gx;
                sb = beta2 * sb + (1 - beta2) * grad.gy * grad.gy;
                const maHat = ma / (1 - Math.pow(beta, t));
                const mbHat = mb / (1 - Math.pow(beta, t));
                const saHat = sa / (1 - Math.pow(beta2, t));
                const sbHat = sb / (1 - Math.pow(beta2, t));
                da = learningRate * maHat / (Math.sqrt(saHat) + epsilon);
                db = learningRate * mbHat / (Math.sqrt(sbHat) + epsilon);
                break;
            default:
                da = learningRate * grad.gx;
                db = learningRate * grad.gy;
        }

        a = a - da;
        b = b - db;

        if (a < bounds.xMin || a > bounds.xMax || b < bounds.yMin || b > bounds.yMax) break;
    }

    if (gdPath.length > 0) {
        const finalPoint = gdPath[gdPath.length - 1];
        els.gdSteps.textContent = gdPath.length;
        els.gdFinal.textContent = formatNum(finalPoint.f);
    }
}

function drawGDPathSVG() {
    if (gdPath.length < 2) return;

    const pathPoints = gdPath.map(pt => {
        const coords = getGlobalCanvasCoords(pt.a, pt.b);
        return `${coords.cx},${coords.cy}`;
    }).join(' ');

    gdPathGroup.append('polyline')
        .attr('points', pathPoints)
        .attr('fill', 'none')
        .attr('stroke', 'rgba(163, 113, 247, 0.8)')
        .attr('stroke-width', 2)
        .attr('stroke-linejoin', 'round')
        .attr('stroke-linecap', 'round')
        .attr('stroke-dasharray', '6,3');

    const startCoords = getGlobalCanvasCoords(gdPath[0].a, gdPath[0].b);
    gdPathGroup.append('circle')
        .attr('cx', startCoords.cx).attr('cy', startCoords.cy).attr('r', 5)
        .attr('fill', 'none')
        .attr('stroke', '#a371f7')
        .attr('stroke-width', 2);

    const endPt = gdPath[gdPath.length - 1];
    const endCoords = getGlobalCanvasCoords(endPt.a, endPt.b);
    gdPathGroup.append('circle')
        .attr('cx', endCoords.cx).attr('cy', endCoords.cy).attr('r', 5)
        .attr('fill', '#a371f7');

    const methodLabels = {
        'vanilla': 'GD', 'momentum': 'Mom', 'nesterov': 'NAG',
        'rmsprop': 'RMS', 'adam': 'Adam'
    };
    gdPathGroup.append('text')
        .attr('x', endCoords.cx + 10).attr('y', endCoords.cy + 4)
        .attr('fill', '#a371f7')
        .attr('font-size', '12px')
        .attr('font-family', 'Outfit, sans-serif')
        .text(methodLabels[gdMethod] || 'GD');
}

// ============ TRAJECTORY (from V4) ============

function drawTrajectorySVG() {
    if (state.history.length === 0) return;

    if (state.history.length > 1) {
        const pathPoints = state.history.map(pt => {
            const coords = getGlobalCanvasCoords(pt.a, pt.b);
            return `${coords.cx},${coords.cy}`;
        }).join(' ');

        trajectoryGroup.append('polyline')
            .attr('points', pathPoints)
            .attr('fill', 'none')
            .attr('stroke', 'rgba(255, 255, 255, 0.7)')
            .attr('stroke-width', 2)
            .attr('stroke-linejoin', 'round')
            .attr('stroke-linecap', 'round');
    }

    for (let i = 0; i < state.history.length; i++) {
        const pt = state.history[i];
        const coords = getGlobalCanvasCoords(pt.a, pt.b);
        const isCurrent = i === state.history.length - 1;

        trajectoryGroup.append('circle')
            .attr('cx', coords.cx).attr('cy', coords.cy)
            .attr('r', isCurrent ? 6 : 3)
            .attr('fill', isCurrent ? '#58a6ff' : 'rgba(255, 255, 255, 0.5)');

        if (isCurrent) {
            trajectoryGroup.append('circle')
                .attr('cx', coords.cx).attr('cy', coords.cy)
                .attr('r', 6)
                .attr('fill', 'none')
                .attr('stroke', '#fff')
                .attr('stroke-width', 2);
        }
    }
}

// ============ PAC-MAN MONSTER ============

function spawnMonster() {
    const bounds = state.globalBounds;
    const aRange = bounds.xMax - bounds.xMin;
    const bRange = bounds.yMax - bounds.yMin;

    const minDistance = Math.min(aRange, bRange) * 0.4;
    let attempts = 0;
    do {
        monster.a = bounds.xMin + 0.1 * aRange + Math.random() * 0.8 * aRange;
        monster.b = bounds.yMin + 0.1 * bRange + Math.random() * 0.8 * bRange;
        const da = monster.a - state.a;
        const db = monster.b - state.b;
        const dist = Math.sqrt(da * da + db * db);
        if (dist >= minDistance || attempts > 50) break;
        attempts++;
    } while (true);

    monster.history = [{ a: monster.a, b: monster.b }];
}

function moveMonster() {
    if (!monsterMode) return;

    const da = state.a - monster.a;
    const db = state.b - monster.b;
    const dist = Math.sqrt(da * da + db * db);

    if (dist > 0) {
        monster.a += (da / dist) * monsterSpeed;
        monster.b += (db / dist) * monsterSpeed;
        monster.history.push({ a: monster.a, b: monster.b });

        if (monster.history.length > 50) {
            monster.history.shift();
        }
    }
}

function checkMonsterCatch() {
    if (!monsterMode) return false;
    const da = state.a - monster.a;
    const db = state.b - monster.b;
    return Math.sqrt(da * da + db * db) < MONSTER_CATCH_DISTANCE;
}

function drawMonsterSVG() {
    if (!monsterMode || monster.history.length === 0) return;

    // Dashed yellow trail
    if (monster.history.length > 1) {
        const pathPoints = monster.history.map(pt => {
            const coords = getGlobalCanvasCoords(pt.a, pt.b);
            return `${coords.cx},${coords.cy}`;
        }).join(' ');

        trajectoryGroup.append('polyline')
            .attr('points', pathPoints)
            .attr('fill', 'none')
            .attr('stroke', 'rgba(255, 204, 0, 0.4)')
            .attr('stroke-width', 3)
            .attr('stroke-linejoin', 'round')
            .attr('stroke-linecap', 'round')
            .attr('stroke-dasharray', '4,4');
    }

    const monsterCoords = getGlobalCanvasCoords(monster.a, monster.b);
    const playerCoords = getGlobalCanvasCoords(state.a, state.b);

    // Distance-based danger level (0 to 1)
    const mdx = state.a - monster.a;
    const mdb = state.b - monster.b;
    const mathDist = Math.sqrt(mdx * mdx + mdb * mdb);
    const dangerThreshold = 2.0;
    const danger = Math.max(0, Math.min(1, 1 - mathDist / dangerThreshold));

    // Mouth faces player
    const dirX = playerCoords.cx - monsterCoords.cx;
    const dirY = playerCoords.cy - monsterCoords.cy;
    const angle = Math.atan2(dirY, dirX);

    const radius = 12 + danger * 4;
    const mouthAngle = 0.4 + danger * 0.3;

    // Danger glow
    if (danger > 0) {
        const pulseRadius = 20 + danger * 25;
        trajectoryGroup.append('circle')
            .attr('cx', monsterCoords.cx)
            .attr('cy', monsterCoords.cy)
            .attr('r', pulseRadius)
            .attr('fill', `rgba(255, 180, 0, ${0.1 + danger * 0.15})`);
    }

    // Outer glow
    trajectoryGroup.append('circle')
        .attr('cx', monsterCoords.cx)
        .attr('cy', monsterCoords.cy)
        .attr('r', radius + 4)
        .attr('fill', `rgba(255, 200, 0, ${0.3 + danger * 0.2})`);

    // Pac-Man arc body
    const startAngle = angle + mouthAngle;
    const endAngle = angle - mouthAngle + 2 * Math.PI;
    const x1 = monsterCoords.cx + radius * Math.cos(startAngle);
    const y1 = monsterCoords.cy + radius * Math.sin(startAngle);
    const x2 = monsterCoords.cx + radius * Math.cos(endAngle);
    const y2 = monsterCoords.cy + radius * Math.sin(endAngle);

    const pacmanPath = `M ${monsterCoords.cx} ${monsterCoords.cy} L ${x1} ${y1} A ${radius} ${radius} 0 1 1 ${x2} ${y2} Z`;

    trajectoryGroup.append('path')
        .attr('d', pacmanPath)
        .attr('fill', '#ffcc00')
        .attr('stroke', '#cc9900')
        .attr('stroke-width', 1);

    // Eye
    const eyeAngle = angle + Math.PI / 4;
    const eyeRadius = radius * 0.35;
    const eyeX = monsterCoords.cx + eyeRadius * Math.cos(eyeAngle);
    const eyeY = monsterCoords.cy + eyeRadius * Math.sin(eyeAngle);

    trajectoryGroup.append('circle')
        .attr('cx', eyeX)
        .attr('cy', eyeY)
        .attr('r', 2.5)
        .attr('fill', '#000');
}

// ============ MOUSE INTERACTION (from V4) ============

function handleMouseDown(e) {
    isDragging = true;
    handleMouseMove(e);
}

function handleMouseMove(e) {
    if (!isDragging) return;

    const rect = els.overlay.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const curr = getGlobalCanvasCoords(state.a, state.b);
    const cx = curr.cx;
    const cy = curr.cy;

    hoverPos = { x: mx, y: my };

    ctxOver.clearRect(0, 0, WIDTH, HEIGHT);
    ctxOver.beginPath();
    ctxOver.moveTo(cx, cy);
    ctxOver.lineTo(mx, my);
    ctxOver.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctxOver.lineWidth = 2;
    ctxOver.setLineDash([5, 5]);
    ctxOver.stroke();
    ctxOver.setLineDash([]);

    ctxOver.beginPath();
    ctxOver.arc(mx, my, 4, 0, Math.PI * 2);
    ctxOver.fillStyle = '#fff';
    ctxOver.fill();

    const dxPx = mx - cx;
    const dyPx = cy - my;

    const xSpan = state.globalBounds.xMax - state.globalBounds.xMin;
    const ySpan = state.globalBounds.yMax - state.globalBounds.yMin;
    const da = (dxPx / WIDTH) * xSpan;
    const db = (dyPx / HEIGHT) * ySpan;
    const stepSize = Math.sqrt(da * da + db * db);

    els.hoverStepSize.textContent = stepSize.toFixed(3);
    els.hoverDa.textContent = da.toFixed(3);
    els.hoverDb.textContent = db.toFixed(3);
}

function handleMouseUp() {
    if (!isDragging) return;
    isDragging = false;

    if (!hoverPos) return;

    const curr = getGlobalCanvasCoords(state.a, state.b);
    const cx = curr.cx;
    const cy = curr.cy;

    const dxPx = hoverPos.x - cx;
    const dyPx = cy - hoverPos.y;

    const xSpan = state.globalBounds.xMax - state.globalBounds.xMin;
    const ySpan = state.globalBounds.yMax - state.globalBounds.yMin;
    const da = (dxPx / WIDTH) * xSpan;
    const db = (dyPx / HEIGHT) * ySpan;

    ctxOver.clearRect(0, 0, WIDTH, HEIGHT);
    hoverPos = null;
    els.hoverStepSize.textContent = '--';
    els.hoverDa.textContent = '--';
    els.hoverDb.textContent = '--';

    state.a += da;
    state.b += db;
    state.steps++;

    updateState();
}

// ============ 3D VIEW STATE ============

function saveStateFor3D() {
    try {
        const playerPath = state.history.map(h => ({ x: h.a, y: h.b }));
        const stateObj = {
            currentFunction,
            funcParams,
            bounds: state.globalBounds,
            dataX,
            dataY,
            lambda,
            colormap: colormapMode,
            playerPath
        };
        localStorage.setItem('gdGameV5State', JSON.stringify(stateObj));
    } catch (e) {
        // localStorage may be unavailable
    }
}

window.onload = init;
