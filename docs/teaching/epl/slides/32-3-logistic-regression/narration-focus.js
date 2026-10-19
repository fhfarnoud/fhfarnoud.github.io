// Attach the shared deck engine's <point> cues before startDeck() expands slides.
// Cues preserve each <say>'s textContent, so existing recordings remain valid.
(() => {
  const slides = [...document.querySelectorAll('.reveal .slides > section')];
  const cues = {
    1: null,
    2: [
      [{ phrase: 'an input, a vector of features', selector: '.problem-setup > p:nth-of-type(1)' },
        { phrase: 'a label from a finite set of classes', selector: '.problem-setup > p:nth-of-type(2)' },
        { phrase: 'We observe training examples whose labels are known', to: 'data' },
        { phrase: 'learn a rule that predicts the label of a new input', selector: '.problem-setup > p:nth-of-type(4)' }],
      [{ phrase: 'For rain tomorrow, the features can be today\'s humidity and pressure', selector: '.cards .altcard:nth-child(1)' },
        { phrase: 'For the next word, the input represents the text so far', selector: '.cards .altcard:nth-child(2)' }]
    ],
    3: [
      [{ phrase: 'gives us just a label for each input', to: 'yhat' },
        { phrase: 'gives the probability of each possible label', to: 'pyx' }],
      [{ phrase: 'These probabilities say how sure the prediction is', selector: '.prob-benefits li:nth-child(1)' },
        { phrase: 'Smooth dependence on the parameters lets gradient descent fit the model', selector: '.prob-benefits li:nth-child(2)' },
        { phrase: 'Sampling from the probabilities generates data', selector: '.prob-benefits li:nth-child(3)' }],
      [{ phrase: 'The curve on the right shows the probability of rain', to: 'label:hy' },
        { phrase: 'We predict rain where that probability exceeds one half', to: 'label:r1' },
        { phrase: 'no rain otherwise', to: 'label:r0' },
        { phrase: 'we pick the class with the highest probability', to: 'argmax' },
        { phrase: 'minimizes the chance of misclassification', to: 'risk' }]
    ],
    4: null,
    5: null,
    6: [[
      { phrase: 'how common each class is', selector: '.model-step:nth-child(1)' },
      { phrase: 'how the inputs of each class are spread', selector: '.model-step:nth-child(2)' },
      { phrase: 'turns these around with Bayes\' rule', to: 'bayes' },
      { phrase: 'skips the distribution of the inputs and models the probability of the label directly', selector: '.model-route.direct > p:first-of-type' },
      { phrase: 'as one curve', selector: '.model-route.direct > svg' }
    ]],
    7: [
      [{ phrase: 'how common each label is', selector: '.density-copy > p:nth-of-type(2)' }],
      [{ phrase: 'distribution of the humidity within each class', selector: '.density-copy > div[pause="st=2"]' },
        { phrase: 'rainy days are centred at a higher humidity', to: 'rain' }],
      [{ phrase: 'joint density of the humidity and that label', to: 'joint' },
        { phrase: 'The dry curve now peaks twice as high', to: 'label:w0' },
        { phrase: 'each posterior is its joint density divided by the density of the humidity', to: 'bayes' }],
      [{ phrase: 'the dashed line in the bottom panel', to: 'label:qx' },
        { phrase: 'The dry one is the larger', to: 'cmp' }]
    ],
    8: [
      [{ phrase: 'add up to the density of the humidity', to: 'px' },
        { phrase: 'dividing the joint density of rain by their sum', to: 'norm' }],
      [{ phrase: 'Divide the top and the bottom by the joint density of rain', to: 'div' },
        { phrase: 'log of the ratio of the two joint densities', to: 'lr' },
        { phrase: 'sigmoid function', to: 'sig' }],
      [{ phrase: 'posterior curve in step four', to: 'label:post' }]
    ],
    9: [[
      { phrase: 'On the left they share the same covariance', selector: '.covariance-card:first-child' },
      { phrase: 'On the right, the rainy class spreads farther', selector: '.covariance-card:last-child' }
    ]],
    10: [
      [{ phrase: 'log of its joint density', to: 'joint' },
        { phrase: 'squared Mahalanobis distance', to: 'maha' }],
      [{ phrase: 'term quadratic in the input', to: 'quad' },
        { phrase: 'term linear in the input', to: 'lin' },
        { phrase: 'constant term', to: 'const' }],
      [{ phrase: 'shared quadratic term cancels', to: 'quad' },
        { phrase: 'linear in the input', to: 'lin' }]
    ],
    11: [
      [{ phrase: 'coefficients beta', to: 'beta' },
        { phrase: 'offset gamma', to: 'gamma' },
        { phrase: 'nonzero off-diagonal entries', selector: '.lda-cov-caption' }],
      [{ phrase: 'where the linear function is zero', to: 'rule' },
        { phrase: 'Its normal is sigma inverse times their difference', to: 'beta' }],
      [{ phrase: 'a hyperplane', to: 'hyp' }]
    ],
    12: [
      [{ phrase: 'The difference of the two log posteriors is the linear function of the previous slide', to: 'lin' },
        { phrase: 'the sigmoid of that linear function', to: 'sig' },
        { phrase: 'one quarter', to: 'label:lv0.25' },
        { phrase: 'three quarters', to: 'label:lv0.75' }],
      [{ phrase: 'The vector beta points perpendicular to each probability level line, toward increasing probability of class one', selector: 'p[pause="bv=1"]' }],
      [{ phrase: 'gamma shifts every level line together', to: 'gam' },
        { phrase: 'minus gamma divided by the length of beta', to: 'dist' }]
    ],
    13: [
      [{ phrase: 'vary the prior probability of class one', selector: '.pi-control' },
        { phrase: 'Watch the decision boundary', to: 'label:lv0.5' }],
      [{ phrase: 'Drag the brown', to: 'label:m0' },
        { phrase: 'teal markers', to: 'label:m1' },
        { phrase: 'position and direction of the boundary', to: 'label:lv0.5' }],
      [{ phrase: 'vary the shared standard deviation', selector: '.explore-controls label:nth-child(2)' },
        { phrase: 'the correlation', selector: '.explore-controls label:nth-child(3)' },
        { phrase: 'the joint density curves below', selector: '.weighted-slice' },
        { phrase: 'a prior of one half and then point six', selector: '.pi-control' }]
    ],
    14: [
      [{ phrase: 'its own covariance matrix', to: 'sigj' },
        { phrase: 'the quadratic terms of the two log posteriors differ', to: 'xax' },
        { phrase: 'a quadratic function of the input is zero', to: 'bnd' },
        { phrase: 'class one is also stretched along humidity and squeezed along pressure', to: 'label:m1' },
        { phrase: 'the boundary bends around it', to: 'label:quad' }],
      [{ phrase: 'Add the squares and the pairwise products of the input coordinates as features', to: 'prod' },
        { phrase: 'a linear rule in that expanded feature vector', to: 'phi' }]
    ],
    15: [[
      { phrase: 'the fraction of training examples in that class', to: 'pi' },
      { phrase: 'each class mean is the average of its examples', to: 'mu' },
      { phrase: 'center each observation at its own class mean, form its outer product', to: 'outer' },
      { phrase: 'average those products over all n observations', to: 'avg' },
      { phrase: 'Naive Bayes with shared variances keeps only the diagonal of this estimate', selector: '.variance-card' }
    ]],
    16: [[
      { phrase: 'Full LDA keeps the correlations between input features', selector: 'column > p:nth-of-type(1)' },
      { phrase: 'sets the off-diagonal covariances to zero', selector: 'column > p:nth-of-type(2)' },
      { phrase: 'That makes the features independent within each class', to: 'prod' },
      { phrase: 'Both models have straight decision boundaries', to: 'label:lda' },
      { phrase: 'yet the fitted lines differ on the same training points', to: 'label:nb' },
      { phrase: 'Naive Bayes estimates fewer covariance parameters', selector: 'column > p:nth-of-type(3)' }
    ]],
    19: null,
    20: [
      [{ phrase: 'the sigmoid of a linear function of the input, with coefficients beta and offset gamma', to: 'gs' },
        { phrase: 'the posterior that Bayes\' rule makes of them', to: 'label:hy' }],
      [{ phrase: 'Is this form limited to Gaussian class-conditionals?', selector: 'column > p:nth-of-type(2)' }],
      [{ phrase: 'any exponential-family class-conditional whose statistic is the input itself', to: 'ef' },
        { phrase: 'the same base term f of x', to: 'f' }],
      [{ phrase: 'what remains is linear in the input', to: 'lin' }],
      [{ phrase: 'Beta is the difference of the natural parameters', to: 'eb' },
        { phrase: 'gamma is the log ratio of the class probabilities plus the difference of the g terms', to: 'eg' }],
      [{ phrase: 'why not model that posterior directly, without the class densities?', selector: 'column > p:nth-of-type(3)' }]
    ],
    21: [
      [{ phrase: 'The generative way, LDA, estimates the class probability, both means and the shared covariance', selector: '.cards .altcard:nth-child(1)' },
        { phrase: 'The discriminative way, logistic regression, skips the class densities', selector: '.cards .altcard:nth-child(2)' }],
      [{ phrase: 'The covariance has a number of free entries that grows with the square of the dimension', to: 'nlda' },
        { phrase: 'logistic regression needs one coefficient per input plus the offset', to: 'nlr' },
        { phrase: 'the gap widens quickly as the dimension grows', selector: '.pair tbody tr:nth-child(3)' },
        { phrase: 'uses the parameters only through beta and gamma', selector: '.pair alertblock' }]
    ],
    22: [
      [{ phrase: 'any real number, which we will call a score', to: 'label:bx' },
        { phrase: 'returns a number that grows with the score', to: 'label:by' }],
      [{ phrase: 'The exponential is always positive, so the denominator is always greater than one', to: 'pos' },
        { phrase: 'every value of the sigmoid lies strictly between zero and one', to: 'range' }],
      [{ phrase: 'A score of zero lands exactly in the middle', to: 'label:s0' },
        { phrase: 'because the exponential of zero is one', to: 'half' }],
      [{ phrase: 'flipping the sign of a score turns its value into one minus that value', to: 'sym' },
        { phrase: 'The two marked points', to: 'label:sy-2' },
        { phrase: 'show this for one pair of scores', to: 'label:sy2' }],
      [{ phrase: 'close to zero on the left', to: 'label:t0' },
        { phrase: 'close to one on the right', to: 'label:t1' }]
    ],
    23: [
      [{ phrase: 'the sigmoid of a linear function of the input', to: 'model' },
        { phrase: 'with the coefficients and the offset as its parameters', to: 'theta' },
        { phrase: 'the midpoint', to: 'label:mid' },
        { phrase: 'The curve on the right has beta equal to one and gamma equal to minus one', to: 'label:par' },
        { phrase: 'its midpoint is at one', to: 'label:mid' }],
      [{ phrase: 'Suppose both beta and gamma are doubled', selector: 'column > p:nth-of-type(3)' },
        { phrase: 'what happens to the midpoint', to: 'label:mid' }],
      [{ phrase: 'leaves the midpoint where it was', to: 'label:mid' },
        { phrase: 'grows twice as fast with x', to: 'label:par' }],
      [{ phrase: 'gamma raised from minus one to one', to: 'g1' },
        { phrase: 'the midpoint moves left', to: 'label:mid' },
        { phrase: 'the midpoint, which depends on both', to: 'midx' }]
    ],
    24: [
      [{ phrase: 'The odds of an event are its probability divided by the probability that it does not happen', to: 'odds' },
        { phrase: 'the log-odds are their logarithm', to: 'lo' },
        { phrase: 'On the right are the log-odds', to: 'label:by' },
        { phrase: 'as a function of the probability', to: 'label:bx' }],
      [{ phrase: 'pairs a few probabilities', selector: 'column table thead tr' },
        { phrase: 'reciprocal odds', selector: 'column table tbody tr:nth-child(1)' },
        { phrase: 'log-odds of opposite sign', selector: 'column table tbody tr:nth-child(2)' },
        { phrase: 'multiplies the odds by the same factor', selector: 'column table tbody tr:nth-child(1)' }],
      [{ phrase: 'If a probability is the sigmoid of a score, its log-odds are that score', to: 'inv' },
        { phrase: 'the sigmoid turns a score into a probability', to: 'hs' },
        { phrase: 'the log-odds turn the probability back into the score', to: 'inv' }],
      [{ phrase: 'the log-odds give back the linear function of the input', to: 'lin' },
        { phrase: 'adds its coefficient to the log-odds', to: 'add' },
        { phrase: 'multiplies the odds by the exponential of the coefficient', to: 'exp' }]
    ],
    25: [
      [{ phrase: 'The solid line', to: 'label:h5' },
        { phrase: 'the side beta points toward', to: 'label:beta' },
        { phrase: 'the boundary is a hyperplane', to: 'hyp' }],
      [{ phrase: '0.25', to: 'label:hb' },
        { phrase: '0.75', to: 'label:hc' },
        { phrase: 'each a hyperplane parallel to the decision boundary', to: 'lev' },
        { phrase: 'signed distance u divided by the length of beta', to: 'dist' }],
      [{ phrase: 'double both beta and gamma', selector: 'column > p:nth-of-type(3)' }],
      [{ phrase: 'The boundary stays put', to: 'label:h5' },
        { phrase: 'inversely proportional to the length of beta', to: 'dist' },
        { phrase: 'The 0.25 and 0.75 lines move toward the boundary', to: 'label:hb label:hc' },
        { phrase: 'Try the slider', selector: 'knob > span:first-child' }]
    ],
    26: [
      [{ phrase: 'A rainy day contributes the log of one over its predicted probability of rain', to: 'h1' },
        { phrase: 'a dry day contributes the same expression using its predicted probability of no rain', to: 'h0' },
        { phrase: 'The current negative log-likelihood appears above the plot', selector: '.llval' }],
      [{ phrase: 'Use the sliders', selector: 'knob > span:first-child' },
        { phrase: 'negative log-likelihood above the plot', selector: '.llval' },
        { phrase: 'checking the box under the plot', selector: 'toggle' }],
      [{ phrase: 'The revealed curve', to: 'label:hy' },
        { phrase: 'At each recorded humidity, the fraction of rainy days', to: 'label:hy' },
        { phrase: 'The sigmoid follows these fractions', to: 'label:hy' }]
    ],
    27: [
      [{ phrase: 'The empirical rain probability is the fraction of rainy days', to: 'label:e0 label:e1 label:e2 label:e3 label:e4' },
        { phrase: 'At fifty percent humidity, none of the ten days was rainy', to: 'label:e0' },
        { phrase: 'The teal points show all five fractions', to: 'label:e0 label:e1 label:e2 label:e3 label:e4' },
        { phrase: 'the purple sigmoid shows the model\'s prediction', to: 'label:ey' }],
      [{ phrase: 'minimize their KL divergence', to: 'kl-fit' }],
      [{ phrase: 'Cross-entropy equals the entropy', to: 'ce-fit' },
        { phrase: 'negative log-likelihood', to: 'ce-fit' }]
    ],
    28: [
      [{ phrase: 'the probability the model assigned to the label that actually occurred', to: 'cost' },
        { phrase: 'that assigned probability is q', to: 'label:bx' },
        { phrase: 'as q approaches zero, the cost rises sharply', to: 'label:by' }],
      [{ phrase: 'If the day was rainy, its cost is about 0.152 nats', to: 'label:va' },
        { phrase: 'If it was dry, its cost is about 1.961 nats', to: 'label:vc' }]
    ],
    29: [
      [{ phrase: 'Call the negative log-likelihood L', to: 'nllx' },
        { phrase: 'Append a one to each input', to: 'xt' },
        { phrase: 'collect beta and gamma in theta', to: 'th' },
        { phrase: 'each extended input', to: 'in' },
        { phrase: 'label minus predicted probability', to: 'err' }],
      [{ phrase: 'Least squares uses the observed value minus a linear prediction', to: 'lserr' },
        { phrase: 'logistic regression uses the label minus the predicted probability', to: 'lrerr' }],
      [{ phrase: 'does not give linear equations or a closed-form estimate', to: 'eq' },
        { phrase: 'the sigmoid depends on theta', to: 'sg' },
        { phrase: 'We therefore use gradient descent', to: 'gd' }]
    ],
    30: [
      [{ phrase: 'The curve on the left is flat at one half', to: 'label:lr' },
        { phrase: 'beta\'s numerical step size is one hundredth of gamma\'s', selector: ':scope > p:nth-of-type(1)' },
        { phrase: 'The right panel plots average loss', to: 'label:ry' },
        { phrase: 'Where do you expect the curve and loss to settle', selector: ':scope > p:nth-of-type(2)' }],
      [{ phrase: 'the probability curve tilts upward', to: 'label:lr' },
        { phrase: 'The loss has fallen only a little', to: 'label:lv' }],
      [{ phrase: 'the curve steepens', to: 'label:lr' },
        { phrase: 'the loss falls further', to: 'label:lv' }],
      [{ phrase: 'the curve approaches the maximum-likelihood fit', to: 'rm' },
        { phrase: 'the dashed minimum', to: 'label:fl' }]
    ],
    31: [[
      { phrase: 'The left panel uses humidity in percent', to: 'label:tt0' },
      { phrase: 'changing beta moves the curve\'s midpoint', selector: ':scope > p:nth-of-type(2)' },
      { phrase: 'The right panel uses humidity centered at seventy percent', to: 'label:tt1' }
    ]],
    32: [
      [{ phrase: 'one training day at a time', selector: ':scope > p:nth-of-type(1)' },
        { phrase: 'The right panel shows the loss', to: 'label:ry' }],
      [{ phrase: 'selected day was dry at fifty percent humidity', to: 'label:sel' },
        { phrase: 'The solid curve moves down', to: 'label:effect' },
        { phrase: 'The dashed curve', selector: ':scope > p:nth-of-type(1)' }],
      [{ phrase: 'selected day is rainy at ninety percent humidity', to: 'label:sel' },
        { phrase: 'raises the curve there', to: 'label:effect' }],
      [{ phrase: 'a dry day at ninety percent humidity', to: 'label:sel' },
        { phrase: 'loss over all days rises', to: 'label:lv' }],
      [{ phrase: 'first thirty-two selected days', selector: '.knobs' },
        { phrase: 'maximum-likelihood fit', to: 'label:min' }]
    ],
    33: [[
      { phrase: 'Both models give the probability of class one as a sigmoid of a linear score', to: 'post' },
      { phrase: 'LDA estimates five thousand two hundred fifty-one parameters', selector: '.cards .altcard:nth-child(1)' },
      { phrase: 'Logistic regression estimates only one hundred one parameters', selector: '.cards .altcard:nth-child(2)' }
    ]],
    34: null,
    35: [
      [{ phrase: 'linear score, called a logit', to: 'z' },
        { phrase: 'the bars on the left are the logits', to: 'label:lt' },
        { phrase: 'the bars on the right are the resulting probabilities', to: 'label:pt' },
        { phrase: 'exponentiates each logit', to: 'num' },
        { phrase: 'divides by their sum', to: 'den' },
        { phrase: 'Use the sliders', selector: '.knobs' }],
      [{ phrase: 'add the same constant to all three logits', to: 'label:lt' },
        { phrase: 'the probabilities remain unchanged', to: 'label:pt' }],
      [{ phrase: 'The probability of class two becomes the sigmoid of the logit difference', to: 'sd' },
        { phrase: 'beta and gamma equal to the differences', to: 'bd' }]
    ],
    36: [
      [{ phrase: 'The logits are x one, x two, and zero', to: 'lg' },
        { phrase: 'Class three wins', to: 'label:k3' }],
      [{ phrase: 'The diagonal', to: 'label:b12' },
        { phrase: 'The negative coordinate axes', to: 'label:b13 label:b23' }],
      [{ phrase: 'At the marked input', to: 'label:pt' },
        { phrase: 'probabilities one half, one third, and one sixth', to: 'label:pq' }],
      [{ phrase: 'tie on a hyperplane', to: 'tie' }]
    ],
    37: [
      [{ phrase: 'negative log probability of each example\'s observed class', to: 'nl' }],
      [{ phrase: 'The two cards show the same pattern', selector: '.cards' },
        { phrase: 'error times extended input', to: 'err in' }],
      [{ phrase: 'the probability of class two is the sigmoid', to: 'p2' },
        { phrase: 'The class-two error and gradient', to: 'i2' }]
    ],
    38: [
      [{ phrase: 'Next-token prediction is a classification problem', to: 'kv' },
        { phrase: 'The text so far is “Tomorrow it will.”', to: 'label:net' },
        { phrase: 'a feature vector', to: 'label:phi' },
        { phrase: 'one linear logit', to: 'z' },
        { phrase: 'predicted probabilities for the next token', to: 'label:ql' }],
      [{ phrase: 'one row of weights and one offset for every vocabulary token', selector: 'column > p:nth-of-type(3)' },
        { phrase: 'ten million ten thousand parameters', to: 'count' }]
    ],
    39: [
      [{ phrase: 'fitting the last layer\'s weights and offsets is softmax regression', to: 'label:sr' },
        { phrase: 'the feature vector with a one appended', to: 'phit' },
        { phrase: 'the error for token k', to: 'grad' },
        { phrase: 'gradient descent learns the features and the last layer together', to: 'label:net' }],
      [{ phrase: 'one linear logit per token', to: 'label:lin' },
        { phrase: 'applies softmax', to: 'label:smx' },
        { phrase: 'the network producing the features', to: 'label:phi' }]
    ],
    40: [[]],
    41: [
      [],
      [{ phrase: 'the probabilities are one half for rain and one quarter each for snow and clear', selector: '.solrow:nth-of-type(1)' }],
      [{ phrase: 'Its loss is log four', selector: 'p.solrow:nth-of-type(2)' }],
      [{ phrase: 'The probabilities stay one half, one quarter, one quarter', selector: 'p.solrow:nth-of-type(3)' }]
    ],
    42: [
      [{ phrase: 'the same cross-entropy used for the rain labels', selector: 'column > p:nth-of-type(1)' },
        { phrase: 'The bars on the left', to: 'label:mt' }],
      [{ phrase: 'average loss is measured in bits per token', to: 'bits' },
        { phrase: 'perplexity is two raised to that average', to: 'ppl' },
        { phrase: 'Its loss is two bits', to: 'label:cost' }],
      [{ phrase: 'The right panel is a hypothetical uniform comparison', to: 'label:ut' },
        { phrase: 'The actual model still has only three tokens', to: 'label:mt' },
        { phrase: 'Perplexity is the exponentiated loss', to: 'label:pp' },
        { phrase: 'for a uniform ten-thousand-token model, this gives ten thousand', to: 'v' }]
    ],
    43: [
      [{ phrase: 'dividing every logit by T before softmax', to: 'ptk' },
        { phrase: 'At T equal to one', to: 't1' },
        { phrase: 'do the probabilities spread out or concentrate on the leading token', selector: 'column > p:nth-of-type(1)' }],
      [{ phrase: 'Rain, the leading token, rises from 0.5 to about 0.667', selector: '.swap > table:nth-child(2) tbody tr:nth-child(2)' },
        { phrase: 'As temperature approaches zero', selector: 'column > p:nth-of-type(2)' }],
      [{ phrase: 'Rain falls to about 0.414', selector: '.swap > table:nth-child(3) tbody tr:nth-child(3)' },
        { phrase: 'the distribution approaches uniform', selector: 'column > p:nth-of-type(3)' }]
    ],
    44: [[
      { phrase: 'Generative classifiers model inputs within each class', selector: '.sumrow:nth-child(1)' },
      { phrase: 'logistic regression models directly', selector: '.sumrow:nth-child(2)' },
      { phrase: 'Maximum likelihood minimizes cross-entropy', selector: '.sumrow:nth-child(3)' },
      { phrase: 'For several classes, softmax', selector: '.sumrow:nth-child(4)' },
      { phrase: 'The next lecture builds language models', selector: '.fbody > p:nth-of-type(2)' }
    ]],
    45: [[
      { phrase: 'Section 6.2.4', selector: 'ol.reading li:nth-child(1)' },
      { phrase: 'Section 6.2.6', selector: 'ol.reading li:nth-child(2)' },
      { phrase: 'Section 6.4', selector: 'ol.reading li:nth-child(3)' },
      { phrase: 'Section 6.2.5', selector: 'ol.reading li:nth-child(4)' }
    ]]
  };

  function target(slide, selector, name) {
    const matches = [...slide.querySelectorAll(selector)];
    if (!matches.length) return null;
    for (const el of matches) el.classList.add('hl-' + name);
    return name;
  }

  function fallback(slide, state, name) {
    const fragments = [...slide.querySelectorAll('[pause]')].filter(el =>
      !el.closest('narration, drawer') && (el.textContent.trim() || el.querySelector('fig, svg, img')));
    const el = state > 0 && fragments[state - 1]
      || slide.querySelector('fig, .model-routes, .density-layout, .covariance-pair, .decision-preview, .cards, .col, .problem-setup, .titlebox, table, p, h2, .frametitle');
    if (!el) return null;
    el.classList.add('hl-' + name);
    return name;
  }

  function mark(say, specs) {
    const original = say.textContent;
    const parts = document.createDocumentFragment();
    let cursor = 0;
    for (const { phrase, to } of specs) {
      const at = original.indexOf(phrase, cursor);
      if (at < 0) { console.warn('Narration focus phrase missing:', phrase); continue; }
      parts.append(document.createTextNode(original.slice(cursor, at)));
      const point = document.createElement('point');
      point.setAttribute('to', to);
      point.textContent = phrase;
      parts.append(point);
      cursor = at + phrase.length;
    }
    parts.append(document.createTextNode(original.slice(cursor)));
    say.replaceChildren(parts);
  }

  slides.forEach((slide, n) => {
    // cues[n] === null: no pointers on the slide; an empty list for a state: none in that state.
    // Only a state with no list at all falls back to ringing its build step.
    if (cues[n + 1] === null) return;
    [...slide.querySelectorAll(':scope > narration > say')].forEach((say, state) => {
      // a cue names its target by `to` (an hl- class written in the slide's math, or label:KEY)
      // or by a CSS `selector` matched here
      const list = cues[n + 1]?.[state];
      const specs = (list || []).map((cue, i) => {
        const to = cue.to || target(slide, cue.selector, `nar-${n + 1}-${state}-${i}`);
        return to && { phrase: cue.phrase, to };
      }).filter(Boolean);
      if (!specs.length && !list) {
        const to = fallback(slide, state, `nar-${n + 1}-${state}`);
        if (to) specs.push({ phrase: say.textContent, to });
      }
      if (specs.length) mark(say, specs);
    });
  });
})();
