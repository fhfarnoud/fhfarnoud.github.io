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
      [{ phrase: 'which happens exactly when the linear part is nonnegative', to: 'ge' },
        { phrase: 'separated by the hyperplane where the linear part is zero', to: 'hyp' },
        { phrase: 'its boundary is the solid line', to: 'label:h5' },
        { phrase: 'with beta drawn from a point on it', to: 'label:beta' }],
      [{ phrase: 'the linear part equals u, which is a hyperplane parallel to the boundary', to: 'lev' },
        { phrase: 'at a distance of u divided by the length of beta', to: 'dist' },
        { phrase: 'The dashed lines on the right are the level sets', to: 'label:hc' }],
      [{ phrase: 'doubling both beta and gamma keeps the boundary in place', selector: 'column > p:nth-of-type(3)' }],
      [{ phrase: 'The level sets move in, each to half its distance from the boundary', to: 'label:hc' },
        { phrase: 'beta, drawn to scale, is twice as long', to: 'label:beta' },
        { phrase: 'changes only how sharply the probability changes across it', selector: 'alertblock' },
        { phrase: 'The slider under the plot scales beta and gamma together', selector: 'knob > span:first-child' }]
    ],
    26: [
      [{ phrase: 'each rainy day contributes the log of one over the model\'s probability of rain', to: 'h1' },
        { phrase: 'each dry day the log of one over one minus that probability', to: 'h0' },
        { phrase: 'The value under the formula is the negative log-likelihood of the curve on the right', selector: 'column > p.llval' }],
      [{ phrase: 'Use the sliders under the plot to search for it', selector: 'knob > span:first-child' },
        { phrase: 'watching its value under the formula', selector: 'column > p.llval' }],
      [{ phrase: 'The minimum is the rain model', selector: 'column > p.llval' }]
    ],
    27: [
      [{ phrase: 'Call the negative log-likelihood the loss L', to: 'nllx' },
        { phrase: 'Append a one to the input', to: 'xt' },
        { phrase: 'collect beta and gamma into theta', to: 'th' },
        { phrase: 'a sum over the days of the input', to: 'in' },
        { phrase: 'weighted by the error, the label minus the predicted probability', to: 'err' }],
      [{ phrase: 'There the error is the label minus a linear prediction', to: 'lserr' },
        { phrase: 'here the label minus the predicted probability', to: 'lrerr' }],
      [{ phrase: 'the predicted probability passes through the sigmoid', to: 'sg' },
        { phrase: 'the equations are nonlinear in theta', to: 'eq' },
        { phrase: 'each step moves theta a small distance against the gradient', to: 'gd' }]
    ],
    28: [
      [{ phrase: 'with a step for beta one hundredth of gamma\'s', selector: ':scope > p:nth-of-type(1)' },
        { phrase: 'On the left are the days and the current curve, flat at the start', to: 'label:lr' },
        { phrase: 'On the right is the loss per day against the number of steps', to: 'label:ry' },
        { phrase: 'predict where the curve will settle', selector: ':scope > p:nth-of-type(2)' }],
      [{ phrase: 'beta and gamma are still small', to: 'label:lr' },
        { phrase: 'the loss has fallen by about a tenth of its starting value', to: 'label:lv' }],
      [{ phrase: 'grow beta and gamma', to: 'label:lr' },
        { phrase: 'the loss falls to about two thirds of its starting value', to: 'label:lv' }],
      [{ phrase: 'the curve approaches the rain model of slide twenty-six', to: 'rm' },
        { phrase: 'the dashed line', to: 'label:fl' }]
    ],
    29: [[
      { phrase: 'On the left, with the raw humidity', to: 'label:tt0' },
      { phrase: 'changing beta moves the midpoint, so gamma has to change with it', selector: ':scope > p:nth-of-type(2)' },
      { phrase: 'On the right, with humidity measured from its middle value', to: 'label:tt1' }
    ]],
    30: [[
      { phrase: 'Both routes end in the same form of posterior', to: 'post' },
      { phrase: 'LDA estimates far more numbers', selector: '.cards .altcard:nth-child(1)' },
      { phrase: 'Logistic regression does not model how the inputs of each class are distributed', selector: '.cards .altcard:nth-child(2)' }
    ]],
    31: [
      [{ phrase: 'Each day adds one term', to: 'term' },
        { phrase: 'the negative log-likelihood', to: 'nll' },
        { phrase: 'the logarithm of one over the probability the model gave to what actually happened', to: 'cost' },
        { phrase: 'On the right is that cost', to: 'label:by' },
        { phrase: 'as a function of the probability', to: 'label:bx' }],
      [{ phrase: 'Put all of a distribution\'s mass on the observed label', to: 'pi' },
        { phrase: 'the model\'s Bernoulli distribution', to: 'qi' },
        { phrase: 'their cross-entropy is exactly this term', to: 'ce' }],
      [{ phrase: 'A rainy day then costs almost nothing', to: 'label:va' },
        { phrase: 'a dry day, which the model thought unlikely, costs many times as much', to: 'label:vc' }]
    ],
    32: [
      [{ phrase: 'replaced by the observed label frequencies at its humidity', to: 'ce' },
        { phrase: 'the entropy of the observed labels', to: 'h' },
        { phrase: 'the relative entropy from them to the model', to: 'd' },
        { phrase: 'the lower part of the bar is the entropy', to: 'label:e0' },
        { phrase: 'the upper part the relative entropy', to: 'label:d0' }],
      [{ phrase: 'The entropy part is fixed by the data', to: 'h' },
        { phrase: 'Only the relative entropy depends on theta', to: 'd' },
        { phrase: 'as the second bar shows', to: 'label:d1' }]
    ],
    33: null,
    34: [
      [{ phrase: 'each class gets its own linear score, called its logit', to: 'z' },
        { phrase: 'exponentiate each one', to: 'num' },
        { phrase: 'divide by the total', to: 'den' },
        { phrase: 'On the right are three logits', to: 'label:lt' },
        { phrase: 'and the probabilities they produce', to: 'label:pt' },
        { phrase: 'The sliders change the three logits', selector: '.knobs' }],
      [{ phrase: 'Adding the same constant to all of them', to: 'label:lt' },
        { phrase: 'the probabilities on the right stay where they were', to: 'label:pt' }],
      [{ phrase: 'leaves the sigmoid of the difference of the two logits', to: 'sd' },
        { phrase: 'whose coefficients are the difference of the two classes\' coefficients', to: 'bd' }]
    ],
    35: [
      [{ phrase: 'each class\'s logit is one coordinate or zero', to: 'lg' },
        { phrase: 'class one wins where the first coordinate is the largest of the three logits', to: 'label:k1' },
        { phrase: 'class two where the second is', to: 'label:k2' },
        { phrase: 'class three where both coordinates are negative', to: 'label:k3' }],
      [{ phrase: 'the diagonal where the two coordinates are equal', to: 'label:b12' },
        { phrase: 'the vertical axis below the origin', to: 'label:b13' },
        { phrase: 'the horizontal axis to its left', to: 'label:b23' }],
      [{ phrase: 'The marked point', to: 'label:pt' },
        { phrase: 'Its probabilities', to: 'label:pq' },
        { phrase: 'as its region says', to: 'label:k1' }],
      [{ phrase: 'two classes tie where the difference of their logits is zero', to: 'tie' }]
    ],
    36: [
      [{ phrase: 'the negative log of the probability the model gave to the observed class', to: 'nl' }],
      [{ phrase: 'Its gradient has the same shape as for two classes', selector: '.cards .altcard:nth-child(1)' },
        { phrase: 'each example contributes minus its input', to: 'in' },
        { phrase: 'times an error', to: 'err' }],
      [{ phrase: 'the indicator of that class', to: 'i2' },
        { phrase: 'minus the sigmoid of the difference of logits', to: 'p2' },
        { phrase: 'the gradient is that of logistic regression', selector: '.cards .altcard:nth-child(1)' }]
    ],
    37: [[]],
    39: [
      [{ phrase: 'a classification with one class per token of the vocabulary', to: 'kv' },
        { phrase: 'a network, with its embeddings and layers', to: 'label:net' },
        { phrase: 'turns the context into a vector of features', to: 'label:phi' },
        { phrase: 'one logit per token, each a linear function of the features', to: 'z' },
        { phrase: 'the list of next-token probabilities of chapter one', to: 'label:ql' }],
      [{ phrase: 'The last layer alone is large', to: 'count' },
        { phrase: 'one row of weights for every token of the vocabulary', selector: 'column > p:nth-of-type(3)' }]
    ],
    40: [
      [{ phrase: 'fitting the last layer is exactly softmax regression', to: 'label:sr' },
        { phrase: 'with the feature vector, extended by a one', to: 'phit' },
        { phrase: 'the same gradient, error times input, now summed over the positions of a text', to: 'grad' },
        { phrase: 'The network learns them together with the last layer', to: 'label:net' }],
      [{ phrase: 'logits that are linear in the features', to: 'label:lin' },
        { phrase: 'a softmax', to: 'label:smx' },
        { phrase: 'What the rest of the network contributes is the features themselves', to: 'label:phi' }]
    ],
    41: [
      [{ phrase: 'it is a cross-entropy', selector: 'column > p:nth-of-type(1)' },
        { phrase: 'On the right is the model of the softmax exercise', to: 'label:mt' }],
      [{ phrase: 'the average loss is measured in bits per token', to: 'bits' },
        { phrase: 'Raising two to this average gives the perplexity', to: 'ppl' },
        { phrase: 'this model pays the cost marked under its bars', to: 'label:cost' }],
      [{ phrase: 'has a perplexity equal to the vocabulary size', to: 'v' },
        { phrase: 'a uniform choice among the tokens on the right', to: 'label:ut' },
        { phrase: 'its perplexity on that word is the number of those tokens', to: 'label:pp' }]
    ],
    42: [
      [{ phrase: 'divide the logits by a temperature first', to: 'ptk' },
        { phrase: 'At temperature one nothing changes', to: 't1' },
        { phrase: 'does a lower temperature spread the probability more evenly, or concentrate it', selector: 'column > p:nth-of-type(1)' }],
      [{ phrase: 'the largest one gains: the distribution sharpens', selector: '.swap > table:nth-child(2) tbody tr:nth-child(2)' },
        { phrase: 'all the probability goes to the token with the largest logit', selector: 'column > p:nth-of-type(2)' }],
      [{ phrase: 'the distribution flattens toward uniform', selector: '.swap > table:nth-child(3) tbody tr:nth-child(3)' },
        { phrase: 'the ranking of the tokens is the same at every temperature', selector: 'column > p:nth-of-type(3)' }]
    ],
    43: [[
      { phrase: 'Generative classifiers model each class\'s inputs', selector: '.sumrow:nth-child(1)' },
      { phrase: 'Logistic regression models that posterior directly', selector: '.sumrow:nth-child(2)' },
      { phrase: 'learns it by minimizing the cross-entropy loss', selector: '.sumrow:nth-child(3)' },
      { phrase: 'With many classes the sigmoid becomes the softmax', selector: '.sumrow:nth-child(4)' },
      { phrase: 'The last slide lists sections of the notes', selector: '.fbody > p:nth-of-type(1)' },
      { phrase: 'Next come language models', selector: '.fbody > p:nth-of-type(2)' }
    ]],
    44: [[
      { phrase: 'Maximum likelihood for LDA and naive Bayes', selector: 'ol.reading li:nth-child(1)' },
      { phrase: 'The exponential-family section', selector: 'ol.reading li:nth-child(2)' },
      { phrase: 'The loss-function section', selector: 'ol.reading li:nth-child(3)' },
      { phrase: 'The section on discrete features is optional', selector: 'ol.reading li:nth-child(4)' }
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
