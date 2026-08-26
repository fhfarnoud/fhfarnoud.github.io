/* Live "winding" figure: x(t), x(t)e^{-i2*pi*f*t} with its integral, and |X(f)|.
 *
 * Rebuilt from FourierComplexPlane.mlapp, which did the same three plots with a
 * frequency spinner. Used by fourier.md and modulation.md.
 *
 *   windingFigure('someId', {select: 'prod', fmax: 30, T: 1});
 *
 * Builds its own DOM inside #someId, deriving every element id from the
 * container id, so several instances can share a page.
 */
window.windingFigure = function (containerId, opts) {
  opts = opts || {};

  var DEFAULT_SIGNALS = [
    {key:'onesin6', label:'1 + sin(2π·6t)',
     fn: function (t) { return 1 + Math.sin(2*Math.PI*6*t); }},
    {key:'cos5', label:'cos(2π·5t)',
     fn: function (t) { return Math.cos(2*Math.PI*5*t); }},
    {key:'cos5p12', label:'cos(2π·5t) + cos(2π·12t)',
     fn: function (t) { return Math.cos(2*Math.PI*5*t) + Math.cos(2*Math.PI*12*t); }},
    {key:'prod', label:'cos(2π·5t) · cos(2π·20t)  (a modulated tone)',
     fn: function (t) { return Math.cos(2*Math.PI*5*t) * Math.cos(2*Math.PI*20*t); }},
    {key:'am', label:'(1 + 0.7cos(2π·5t)) · cos(2π·20t)  (AM)',
     fn: function (t) { return (1 + 0.7*Math.cos(2*Math.PI*5*t)) * Math.cos(2*Math.PI*20*t); }},
    {key:'square', label:'square wave, 10 Hz',
     fn: function (t) { return (Math.floor(20*t) % 2 === 0) ? 0.5 : -0.5; }},
    {key:'pulse', label:'a single pulse',
     fn: function (t) { return Math.exp(-Math.pow((t-0.5)/0.03, 2)); }}
  ];

  var SIGNALS = opts.signals || DEFAULT_SIGNALS,
      FMAX    = opts.fmax || 30,
      T       = opts.T || 1,
      N       = 900,
      NF      = 241,
      dt      = T / (N - 1),
      BLUE    = '#0072BD',
      ORANGE  = '#D95319';

  var root = document.getElementById(containerId);
  if (!root) { return; }
  var id = function (s) { return containerId + s; };

  // captions are plain HTML: this runs before MathJax has necessarily typeset
  root.innerHTML =
    '<div style="margin-bottom:8px;">' +
      '<label for="' + id('Sig') + '"><strong>Signal</strong> x(t):</label> ' +
      '<select id="' + id('Sig') + '" style="font-size:15px; padding:2px 4px;"></select>' +
      '&nbsp;&nbsp;<label for="' + id('F') + '"><strong>winding frequency</strong> f =</label> ' +
      '<span id="' + id('Fval') + '" style="display:inline-block; min-width:3.2em; font-family:monospace;"></span> Hz ' +
      '<input id="' + id('F') + '" type="range" min="0" max="' + FMAX + '" step="0.1" value="5" ' +
             'style="vertical-align:middle; width:230px;">' +
    '</div>' +
    '<div>' +
      '<div style="display:inline-block; vertical-align:top; margin-right:10px;">' +
        '<div style="text-align:center; font-size:14px;">x(t)</div>' +
        '<div id="' + id('BoxT') + '" class="jxgbox" style="width:270px; height:230px;"></div></div>' +
      '<div style="display:inline-block; vertical-align:top; margin-right:10px;">' +
        '<div style="text-align:center; font-size:14px;">x(t)&thinsp;e<sup>&minus;i2&pi;ft</sup> and its integral</div>' +
        '<div id="' + id('BoxZ') + '" class="jxgbox" style="width:270px; height:230px;"></div></div>' +
      '<div style="display:inline-block; vertical-align:top;">' +
        '<div style="text-align:center; font-size:14px;">|X(f)|</div>' +
        '<div id="' + id('BoxF') + '" class="jxgbox" style="width:270px; height:230px;"></div></div>' +
    '</div>';

  var sel = document.getElementById(id('Sig')),
      sli = document.getElementById(id('F')),
      lbl = document.getElementById(id('Fval'));
  SIGNALS.forEach(function (s) {
    var o = document.createElement('option');
    o.value = s.key; o.innerHTML = s.label;
    sel.appendChild(o);
  });
  sel.value = opts.select || SIGNALS[0].key;

  var tt = new Array(N), xx = new Array(N), i;
  for (i = 0; i < N; i++) { tt[i] = i * dt; }

  // integral of x(t) e^{-i2 pi f t} dt, by the trapezoid rule
  function coeff(f) {
    var re = 0, im = 0, k, w, a;
    for (k = 0; k < N; k++) {
      w = (k === 0 || k === N - 1) ? 0.5 : 1.0;
      a = -2 * Math.PI * f * tt[k];
      re += w * xx[k] * Math.cos(a);
      im += w * xx[k] * Math.sin(a);
    }
    return [re * dt, im * dt];
  }

  var ff = [], mag = [];
  function spectrum() {
    ff.length = 0; mag.length = 0;
    for (var k = 0; k < NF; k++) {
      var f = k * FMAX / (NF - 1), c = coeff(f);
      ff.push(f); mag.push(Math.hypot(c[0], c[1]));
    }
  }

  // the y tick labels sat on the box edge and got clipped; nudge them inward.
  // x labels are already hidden on the panels where they crossed the curve.
  var base = { axis: true, showCopyright: false, showNavigation: false,
               pan: {enabled: false}, zoom: {enabled: false},
               defaultAxes: {
                 y: {ticks: {label: {offset: [8, 0], anchorX: 'left'}}}
               } };
  function mk(box, bb) {
    return JXG.JSXGraph.initBoard(box, Object.assign({}, base, {boundingbox: bb}));
  }
  var bT = mk(id('BoxT'), [-0.06*T, 2.1, 1.06*T, -2.1]),
      bZ = mk(id('BoxZ'), [-1.25*270/230, 1.25, 1.25*270/230, -1.25]),
      bF = mk(id('BoxF'), [-FMAX/15, 0.62, FMAX*1.033, -0.06]);

  // the signal crosses y = 0, so the x tick labels would sit on top of it
  try { bT.defaultAxes.x.defaultTicks.setAttribute({drawLabels: false}); } catch (e) {}

  var curT = bT.create('curve', [tt, xx], {strokeColor: BLUE, strokeWidth: 1.6});
  var curZ = bZ.create('curve', [[0],[0]], {strokeColor: BLUE, strokeWidth: 1.4});
  var segZ = bZ.create('segment', [[0,0],[0,0]],
                       {strokeColor: ORANGE, strokeWidth: 2.5, lastArrow: true});
  bZ.create('circle', [[0,0], 1], {strokeColor: '#ddd', strokeWidth: 1, dash: 2, fixed: true});
  var curF = bF.create('curve', [[0],[0]], {strokeColor: BLUE, strokeWidth: 1.6});
  var segF = bF.create('segment', [[0,0],[0,0]], {strokeColor: ORANGE, strokeWidth: 2.5});
  var dotF = bF.create('point', [0,0], {face: 'o', size: 3, strokeColor: ORANGE,
                                        fillColor: ORANGE, fixed: true, withLabel: false});

  function redrawZ() {
    var f = parseFloat(sli.value), k, a;
    lbl.textContent = f.toFixed(1);
    var zr = new Array(N), zi = new Array(N);
    for (k = 0; k < N; k++) {
      a = -2 * Math.PI * f * tt[k];
      zr[k] = xx[k] * Math.cos(a);
      zi[k] = xx[k] * Math.sin(a);
    }
    curZ.dataX = zr; curZ.dataY = zi;
    var c = coeff(f), h = Math.hypot(c[0], c[1]);
    segZ.point2.setPosition(JXG.COORDS_BY_USER, [c[0], c[1]]);
    segF.point1.setPosition(JXG.COORDS_BY_USER, [f, 0]);
    segF.point2.setPosition(JXG.COORDS_BY_USER, [f, h]);
    dotF.setPosition(JXG.COORDS_BY_USER, [f, h]);
    bZ.update(); bF.update();
  }

  function rebuild() {
    var fn = SIGNALS.filter(function (s) { return s.key === sel.value; })[0].fn, k, m = 0, fm = 0;
    for (k = 0; k < N; k++) { xx[k] = fn(tt[k]); }
    for (k = 0; k < N; k++) { m = Math.max(m, Math.abs(xx[k])); }
    bT.setBoundingBox([-0.06*T, m*1.25, 1.06*T, -m*1.25], false);
    curT.dataX = tt; curT.dataY = xx;
    spectrum();
    curF.dataX = ff; curF.dataY = mag;
    for (k = 0; k < NF; k++) { fm = Math.max(fm, mag[k]); }
    fm = Math.max(fm, 0.05);
    bF.setBoundingBox([-FMAX/15, fm*1.22, FMAX*1.033, -fm*0.1], false);
    bT.update();
    redrawZ();
  }

  sel.addEventListener('change', rebuild);
  sli.addEventListener('input', redrawZ);
  rebuild();
};
