# Validation record

All new slides were rendered in the VS Code preview at the deck's 1280 × 720
presentation proportions. Initial, intermediate, and final reveal states
were captured and inspected. The contact sheet uses real rendered frames,
with accumulated samples on the main demonstrations.

Visual review covered all Slides 2–18, section overviews, and integration
with the original title and Slide 1. No clipped mathematics, overflowing
controls, or overlapping slide content remained in the reviewed states.
Corrections included wrapping slider captions, clipping rejected proposals
to the joint axes, and scaling the histogram for very small retained sets.

Native UI checks exercised sampling batches, coordinate updates, sweep
completion, reset, conditional direction, negative correlation, play/pause,
leapfrog substeps, complete trajectories, HMC iterations, large HMC step
sizes, extreme burn-in/thinning, section links, backward navigation, and
Escape/O map opening and closing. A separate handler harness exercised every
new button action and both bounds of every new slider. Histories persist
through reveal redraws. Reset restores defaults without changing data.

## Numerical checks

- Metropolis and Gibbs: 100,000 retained draws at correlations −0.9, 0, 0.8,
  and 0.95 recover the zero means, unit variances, and specified covariance.
- Gibbs: coordinate updates and full sweeps use the newest available values.
- Metropolis: rejected transitions record the preceding state.
- Exact Hamiltonian motion conserves energy to floating-point precision.
- Twenty leapfrog steps followed by momentum reversal and twenty further
  steps return to the original position and reversed original momentum at
  step sizes 0.02, 0.2, and 0.8.
- HMC: 79,000 retained draws at step sizes 0.25 and 0.85 recover the Gaussian
  target. Acceptance rates were approximately 98.7% and 38.8%. Starting
  Hamiltonians use the freshly sampled momentum.
- The fixed logistic posterior was independently integrated on a 0.005-spaced
  2D grid. Grid slope mean: 1.887542, 95% interval [1.669871, 2.117732].
  A 48,000-draw retained Metropolis run gave mean 1.890791.
  Boundary mass was approximately 2.1 × 10⁻¹⁸. Full grid results are saved in
  `logistic-grid.json`. The posterior need not center exactly on the generating
  slope of 2.
- All 73 mathematical expressions in the deck parsed with KaTeX's strict
  error option.

## Preservation and navigation

The original title and Slide 1 section markup were compared byte for byte
with the pre-edit snapshot. `lecture.css`, `lecture.js`, and `sampler.js`
were also unchanged. Sampling I has no modifications.

Content numbering is sequential from 1 through 18. The title and three
section stops have no content number. Total planned teaching time: 54 minutes.
The shared Reveal engine supplies Sampling I's fade transition, progressive
reveals, keyboard controls, notes, scaling, and toolbar. Thumbnail-map code
was adapted directly from Sampling I. The section overview stops remain
explicit slides.

## Slide 2 revision: independent iteration window

The latest Slide 2 is captured in `sampling-chain.png`. It was inspected in
VS Code at presentation proportions, including initial, intermediate, and
final reveal states. The actual KaTeX formula and theta axis labels now
preserve their backslashes using raw JavaScript strings. No text, equations,
plots, or controls clipped or overlapped in the inspected states.

The mixture component standard deviation is now 0.5. The t slider controls
100–10,000 displayed iterations independently of burn-in B (0–100) and
thinning m (1–20). Selection uses B+m, B+2m, ... up to t. The histogram and
green markers use exactly this selection. A zero-retained setting leaves
the correctly normalized target curve visible without histogram bars.

Live VS Code checks covered B=0 and B=100, m=1 and m=10, t=100 and t=10,000,
both batch buttons, reset, and reveal navigation. Changing B/m left the
trace window unchanged. Increasing t extended the same history. Numerical
and actual figure-handler checks also covered m=20, 9,900 retained states,
reproducible reset, stable history prefixes, acceptance decisions, recorded
rejections, normalized density, and strict parsing of the actual rendered
formula. The target variance is 4.25. Long chains remain strongly dependent
across modes, so finite runs need not balance their mode occupancy.

All other 21 section bodies were compared byte for byte with the pre-edit
snapshot. Rendered outputs of all 16 other demonstration figures were
unchanged. The Slide 2 map thumbnail was refreshed from the reviewed frame.
The original whole-deck contact sheet predates this Slide 2 revision.

## Slide 2 proposal-scale revision

Increased only this demonstration's Gaussian proposal standard deviation
from 0.5 to 2. The mixture, seed 121, initial state, acceptance rule, and
sample-selection controls are unchanged. The first 500 iterations contain
22 sign crossings and an acceptance rate of 35.2%. After discarding the
first 100 states, 216 retained states occupy the left mode and 184 the right.
This is an observed seeded run, not a guarantee for arbitrary random runs.
The numerical sampler checks pass, including normalized target density,
acceptance decisions, recorded rejections, reset reproducibility, and stable
prefixes. A 298,000-state post-burn-in run has mean -0.00245 and variance
4.25368, compared with target values 0 and 4.25.

The complete rendered slide was inspected in VS Code with t=500, B=100,
and m=1. Both histogram peaks are populated, the trace shows actual mode
transitions, and all labels, equations, and controls fit. `sampling-chain.png`
and the Slide 2 map thumbnails now show this reviewed 500-iteration state.
Other slide section bodies remain byte-for-byte unchanged.

## Slide 2 distant starting state

The initial state is now -15. The target, proposal standard deviation 2,
and seed 121 are unchanged. The trace includes the full initial transient
with labeled ticks down to -15. The histogram range follows retained states,
so initial outliers are shown at B=0 and do not compress the peaks after
burn-in removes them. Histogram normalization includes all retained states.

The seeded chain first reaches within one unit of the left peak at iteration
23 and reaches the right half-line at iteration 111. By iteration 500,
after B=100, the left and right counts remain 216 and 184. Numerical and
actual figure-handler checks pass. The complete live VS Code slide was
visually inspected at t=500 with B=0 and B=100. Both the initial transient
and its removal from the histogram are visible. The screenshot and Slide 2
map thumbnails were refreshed. Other sections and all 16 other figure
render outputs are unchanged.

## Slide 4: Why Small Jumps Are Slow

Replaced only the random-walk section with the displacement definition,
expected absolute distance, second-moment derivation, cross-term explanation,
and large-T scaling. Expected absolute displacement is distinguished from
RMS through the sqrt(2/pi) asymptotic factor. No separate RMS variable is
introduced. The three reveal states retain earlier mathematics and add
the derivation followed by the scaling conclusion. The takeaway is below
the single plot. `random-walk.png` and `random-walk-reveals.jpg` show the
reviewed final state and all reveal states. Slide 4's map thumbnail is updated.

All three states were visually inspected in the live VS Code preview at
presentation proportions. An initial bottom overflow and legend collision
were corrected and the corrected frames were inspected again. The final
state fits within the slide. Live slider checks at epsilon=0.1 and 1 with
T=100 confirmed unchanged y-axis ticks and visibly different displacement
scales. T=1000 was also visually inspected. Numerical checks at T=10,100,1000
and epsilon=0.1,0.5,1 confirm actual signed-step trajectories, identical
underlying directions, fixed y-axis bounds across epsilon, finite plot
geometry, and epsilon*sqrt(T) theoretical RMS.

The exact button handlers were exercised for one step, run, five animation
ticks, pause, and reset. Both slider bounds were exercised through the input
handlers. Reset restores the same directions. The T slider now increments
by one so single-step actions and its displayed value remain synchronized.
All nine source mathematical expressions parse with strict KaTeX settings.
Other 21 section bodies and all 16 other demonstration render outputs were
compared against the pre-edit snapshot and are unchanged.

## Slide 4 follow-up: adaptive vertical scale

The dashed-curve legend now renders plus/minus epsilon sqrt(T) with actual
KaTeX math. Removed the bottom large-T approximation and constant-factor
paragraph from slide text. Speaker notes retain the mathematical distinction.
The vertical range now scales with the selected epsilon so the blue steps
remain visible at epsilon=0.1. Tick values retain nonzero decimal values at
small scales. Same random directions and all sampling controls are preserved.
The actual slide was visually inspected in VS Code at epsilon=0.5 and 0.1.
The minimum-step trace is clearly visible and all content fits. Numerical
checks across T=10,100,1000 and epsilon=0.1,0.5,1 confirm the adaptive range,
correct displacements, unchanged directions, and correct theoretical RMS.
`random-walk.png` and the Slide 4 thumbnails show the latest minimum-step
setting. The earlier reveal contact sheet predates this follow-up. Other
slide section bodies are unchanged.
