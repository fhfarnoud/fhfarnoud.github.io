/* Slide 2 only: one seeded chain and independent display/burn-in/thinning controls. */
const S2_CHAIN = (() => {
  const tau = 2, sd = 0.5, seed = 121, start = -15;
  function logDensity(theta) {
    const a = -0.5 * ((theta + 2) / sd) ** 2;
    const b = -0.5 * ((theta - 2) / sd) ** 2;
    const peak = Math.max(a, b);
    return peak + Math.log(Math.exp(a - peak) + Math.exp(b - peak))
      - Math.log(2 * sd * Math.sqrt(2 * Math.PI));
  }
  const density = theta => Math.exp(logDensity(theta));
  function create() {
    const random = S2.rng(seed);
    const chain = { start, current: start, history: [], moves: [], accepted: 0 };
    let logCurrent = logDensity(start);
    chain.run = count => {
      for (let i = 0; i < count; i++) {
        const from = chain.current;
        const proposal = from + tau * S2.normalPair(random)[0];
        const logProposal = logDensity(proposal);
        const logAlpha = Math.min(0, logProposal - logCurrent);
        const u = random(), accepted = Math.log(u) <= logAlpha;
        if (accepted) {
          chain.current = proposal;
          logCurrent = logProposal;
          chain.accepted++;
        }
        chain.moves.push({ from, proposal, alpha: Math.exp(logAlpha), u, accepted });
        chain.history.push(chain.current); // Rejections record a repeated state.
      }
      return chain;
    };
    chain.ensure = count => chain.run(Math.max(0, count - chain.history.length));
    return chain;
  }
  function select(chain, burn, thin, shown) {
    // State theta_t is stored at history[t - 1]. The display window is 1,...,T.
    // B and m only select within that window, at B+m, B+2m,... <= T.
    chain.ensure(shown);
    const count = Math.max(0, Math.floor((shown - burn) / thin));
    const iterations = Array.from({ length: count }, (_, s) => burn + (s + 1) * thin);
    return { shown, iterations, values: iterations.map(t => chain.history[t - 1]) };
  }
  return { tau, sd, seed, start, logDensity, density, create, select };
})();
