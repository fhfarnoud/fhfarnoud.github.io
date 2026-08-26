/* Live AM / AM-SC / FM / PM figure: message, modulated signal, and |X(f)|.
 *
 *   modulationFigure('someId');
 *
 * Same construction as winding.js: builds its own DOM inside the container and
 * derives every element id from the container id.
 */
window.modulationFigure = function (containerId) {
  var N = 2000, T = 1, dt = T / (N - 1), FC = 20,
      BLUE = '#0072BD', ORANGE = '#D95319',
      NF = 401, FMAX = 50;

  var MESSAGES = {
    tone:  {label: 'tone, 2 Hz', fn: function (t) { return Math.cos(2*Math.PI*2*t); }},
    ramps: {label: 'ramps', fn: function (t) {
              if (t < 0.25) { return 0; }
              if (t < 0.5)  { return (t - 0.25) / 0.25; }
              if (t < 0.75) { return -(t - 0.5) / 0.25; }
              return 0.4;
            }}
  };
  // range, step, default and symbol of the index slider, per scheme
  var SCHEMES = {
    am:   {label: 'AM',    sym: 'm',        min: 0, max: 1.5, step: 0.05, def: 0.7},
    amsc: {label: 'AM-SC', sym: '',         min: 0, max: 1,   step: 0.05, def: 1, off: true},
    fm:   {label: 'FM',    sym: 'f<sub>Δ</sub>', min: 0, max: 12, step: 0.5, def: 6, unit: ' Hz'},
    pm:   {label: 'PM',    sym: 'k<sub>p</sub>', min: 0, max: 1, step: 0.05, def: 0.5}
  };

  var root = document.getElementById(containerId);
  if (!root) { return; }
  var id = function (s) { return containerId + s; };

  root.innerHTML =
    '<div style="margin-bottom:8px;">' +
      '<label for="' + id('Msg') + '"><strong>Message</strong></label> ' +
      '<select id="' + id('Msg') + '" style="font-size:15px; padding:2px 4px;"></select>&nbsp;&nbsp;' +
      '<label for="' + id('Sch') + '"><strong>Scheme</strong></label> ' +
      '<select id="' + id('Sch') + '" style="font-size:15px; padding:2px 4px;"></select>&nbsp;&nbsp;' +
      '<span id="' + id('Lab') + '"></span> ' +
      '<input id="' + id('Idx') + '" type="range" style="vertical-align:middle; width:180px;">' +
    '</div>' +
    '<div>' +
      '<div style="display:inline-block; vertical-align:top; margin-right:10px;">' +
        '<div style="text-align:center; font-size:14px;">x<sub>m</sub>(t)</div>' +
        '<div id="' + id('BoxM') + '" class="jxgbox" style="width:270px; height:230px;"></div></div>' +
      '<div style="display:inline-block; vertical-align:top; margin-right:10px;">' +
        '<div style="text-align:center; font-size:14px;">modulated signal</div>' +
        '<div id="' + id('BoxS') + '" class="jxgbox" style="width:270px; height:230px;"></div></div>' +
      '<div style="display:inline-block; vertical-align:top;">' +
        '<div style="text-align:center; font-size:14px;">|X(f)|</div>' +
        '<div id="' + id('BoxF') + '" class="jxgbox" style="width:270px; height:230px;"></div></div>' +
    '</div>';

  var msgSel = document.getElementById(id('Msg')),
      schSel = document.getElementById(id('Sch')),
      slider = document.getElementById(id('Idx')),
      label  = document.getElementById(id('Lab'));
  Object.keys(MESSAGES).forEach(function (k) {
    var o = document.createElement('option'); o.value = k; o.textContent = MESSAGES[k].label;
    msgSel.appendChild(o);
  });
  Object.keys(SCHEMES).forEach(function (k) {
    var o = document.createElement('option'); o.value = k; o.textContent = SCHEMES[k].label;
    schSel.appendChild(o);
  });

  var tt = new Array(N), xm = new Array(N), ys = new Array(N), env = new Array(N), i;
  for (i = 0; i < N; i++) { tt[i] = i * dt; }

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
  var bM = mk(id('BoxM'), [-0.06, 1.3, 1.06, -1.3]),
      bS = mk(id('BoxS'), [-0.06, 2.6, 1.06, -2.6]),
      bF = mk(id('BoxF'), [-FMAX/15, 0.62, FMAX*1.033, -0.06]);
  [bM, bS].forEach(function (b) {
    try { b.defaultAxes.x.defaultTicks.setAttribute({drawLabels: false}); } catch (e) {}
  });

  var curM = bM.create('curve', [[0],[0]], {strokeColor: ORANGE, strokeWidth: 1.6});
  var curS = bS.create('curve', [[0],[0]], {strokeColor: BLUE, strokeWidth: 0.9});
  var curE1 = bS.create('curve', [[0],[0]], {strokeColor: ORANGE, strokeWidth: 1.4});
  var curE2 = bS.create('curve', [[0],[0]], {strokeColor: ORANGE, strokeWidth: 1.4});
  var curF = bF.create('curve', [[0],[0]], {strokeColor: BLUE, strokeWidth: 1.6});

  function coeff(f) {
    var re = 0, im = 0, k, w, a;
    for (k = 0; k < N; k++) {
      w = (k === 0 || k === N - 1) ? 0.5 : 1.0;
      a = -2 * Math.PI * f * tt[k];
      re += w * ys[k] * Math.cos(a);
      im += w * ys[k] * Math.sin(a);
    }
    return Math.hypot(re * dt, im * dt);
  }

  function rebuild() {
    var sch = SCHEMES[schSel.value], mfn = MESSAGES[msgSel.value].fn, k, idx = parseFloat(slider.value);
    for (k = 0; k < N; k++) { xm[k] = mfn(tt[k]); }

    var showEnv = false, run = 0;
    for (k = 0; k < N; k++) {
      if (schSel.value === 'am') {
        env[k] = 1 + idx * xm[k];
        ys[k] = env[k] * Math.cos(2*Math.PI*FC*tt[k]);
        showEnv = true;
      } else if (schSel.value === 'amsc') {
        ys[k] = xm[k] * Math.cos(2*Math.PI*FC*tt[k]);
      } else if (schSel.value === 'fm') {
        if (k > 0) { run += (xm[k] + xm[k-1]) / 2 * dt; }   // cumulative trapezoid
        ys[k] = Math.cos(2*Math.PI*FC*tt[k] + 2*Math.PI*idx*run);
      } else {
        ys[k] = Math.cos(2*Math.PI*FC*tt[k] + 2*Math.PI*idx*xm[k]);
      }
    }

    curM.dataX = tt; curM.dataY = xm.slice();
    curS.dataX = tt; curS.dataY = ys.slice();
    // FM and PM never exceed 1, so a fixed +/-2.6 box wasted half the panel
    var top = 0;
    for (k = 0; k < N; k++) { top = Math.max(top, Math.abs(ys[k])); }
    if (showEnv) { for (k = 0; k < N; k++) { top = Math.max(top, Math.abs(env[k])); } }
    bS.setBoundingBox([-0.06, top*1.2, 1.06, -top*1.2], false);
    if (showEnv) {
      curE1.dataX = tt; curE1.dataY = env.slice();
      curE2.dataX = tt; curE2.dataY = env.map(function (v) { return -v; });
    } else {
      curE1.dataX = [0]; curE1.dataY = [0]; curE2.dataX = [0]; curE2.dataY = [0];
    }

    var ff = [], mag = [], fm = 0;
    for (k = 0; k < NF; k++) {
      var f = k * FMAX / (NF - 1), c = coeff(f);
      ff.push(f); mag.push(c); fm = Math.max(fm, c);
    }
    curF.dataX = ff; curF.dataY = mag;
    fm = Math.max(fm, 0.05);
    bF.setBoundingBox([-FMAX/15, fm*1.22, FMAX*1.033, -fm*0.1], false);
    bM.update(); bS.update(); bF.update();
  }

  function syncSlider() {
    var sch = SCHEMES[schSel.value];
    slider.min = sch.min; slider.max = sch.max; slider.step = sch.step;
    slider.disabled = !!sch.off;
    slider.value = sch.def;          // each scheme starts at its own default
    showLabel();
  }
  function showLabel() {
    var sch = SCHEMES[schSel.value];
    if (sch.off) { label.innerHTML = '<em style="color:#777;">no index for AM-SC</em>'; return; }
    var v = parseFloat(slider.value), red = (schSel.value === 'am' && v > 1);
    label.innerHTML = '<strong>' + sch.sym + '</strong> = <span style="font-family:monospace;' +
      (red ? 'color:#c00;' : '') + '">' + v.toFixed(2) + (sch.unit || '') + '</span>';
  }

  schSel.addEventListener('change', function () { syncSlider(); rebuild(); });
  msgSel.addEventListener('change', rebuild);
  slider.addEventListener('input', function () { showLabel(); rebuild(); });

  schSel.value = 'am'; slider.value = SCHEMES.am.def;
  syncSlider(); rebuild();
};
