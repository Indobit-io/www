// Correlation statistics. Pure functions, no I/O.
//
// Two things make naive "whale flow correlates with price" analysis wrong, and
// both are handled here:
//   1. Whale flow is violently heavy-tailed. One $400M transfer dominates a
//      Pearson correlation entirely, so Spearman (rank-based) is reported
//      alongside it and disagreement between the two is a red flag.
//   2. Scanning many lags to find the "best" one is multiple hypothesis
//      testing. The scan reports a Bonferroni-adjusted threshold so a lag that
//      only looks good because 13 were tried does not read as a finding.

export interface CorrelationResult {
  n: number;
  pearson: number;
  spearman: number;
  /** Two-tailed p-value for the Pearson coefficient under H0: rho = 0. */
  pValue: number;
}

export function mean(xs: number[]): number {
  if (!xs.length) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

export function stdDev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  const variance = xs.reduce((acc, x) => acc + (x - m) ** 2, 0) / (xs.length - 1);
  return Math.sqrt(variance);
}

export function pearson(xs: number[], ys: number[]): number {
  const n = Math.min(xs.length, ys.length);
  if (n < 3) return 0;
  const mx = mean(xs.slice(0, n));
  const my = mean(ys.slice(0, n));
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    const a = xs[i] - mx;
    const b = ys[i] - my;
    num += a * b;
    dx += a * a;
    dy += b * b;
  }
  const denom = Math.sqrt(dx * dy);
  if (denom === 0) return 0;
  const r = num / denom;
  return Math.max(-1, Math.min(1, r));
}

/** Fractional ranks, averaging ties — required for a correct Spearman. */
export function rank(xs: number[]): number[] {
  const idx = xs.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
  const out = new Array<number>(xs.length);
  let i = 0;
  while (i < idx.length) {
    let j = i;
    while (j + 1 < idx.length && idx[j + 1].v === idx[i].v) j++;
    const avgRank = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) out[idx[k].i] = avgRank;
    i = j + 1;
  }
  return out;
}

export function spearman(xs: number[], ys: number[]): number {
  const n = Math.min(xs.length, ys.length);
  if (n < 3) return 0;
  return pearson(rank(xs.slice(0, n)), rank(ys.slice(0, n)));
}

// --- Student's t distribution -------------------------------------------
// Continued-fraction incomplete beta (Numerical Recipes, betacf/betai). Used
// for the two-tailed p-value; no stats dependency needed.

function logGamma(x: number): number {
  const cof = [
    76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155,
    0.1208650973866179e-2, -0.5395239384953e-5,
  ];
  let y = x;
  const tmp = x + 5.5 - (x + 0.5) * Math.log(x + 5.5);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) ser += cof[j] / ++y;
  return -tmp + Math.log((2.5066282746310005 * ser) / x);
}

function betacf(a: number, b: number, x: number): number {
  const FPMIN = 1e-300;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= 200; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 3e-12) break;
  }
  return h;
}

/** Regularized incomplete beta I_x(a, b). */
function betai(a: number, b: number, x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(
    logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x)
  );
  return x < (a + 1) / (a + b + 2) ? (bt * betacf(a, b, x)) / a : 1 - (bt * betacf(b, a, 1 - x)) / b;
}

/** Two-tailed p-value for a Pearson r over n paired observations. */
export function correlationPValue(r: number, n: number): number {
  if (n < 4) return 1;
  const rr = Math.min(Math.abs(r), 0.999999);
  const df = n - 2;
  const t = rr * Math.sqrt(df / (1 - rr * rr));
  return betai(df / 2, 0.5, df / (df + t * t));
}

export function correlate(xs: number[], ys: number[]): CorrelationResult {
  const n = Math.min(xs.length, ys.length);
  const p = pearson(xs, ys);
  return {
    n,
    pearson: p,
    spearman: spearman(xs, ys),
    pValue: correlationPValue(p, n),
  };
}

// --- Lag scan ------------------------------------------------------------

export interface LagResult extends CorrelationResult {
  /** Buckets by which the price series is shifted forward relative to flow. */
  lag: number;
}

export interface LagScan {
  lags: LagResult[];
  /** Largest |pearson| across the scan. */
  best: LagResult | null;
  /** Lag 0, kept separately so "contemporaneous" is always reported. */
  concurrent: LagResult | null;
  /** 0.05 / number of lags tested. */
  bonferroniAlpha: number;
  /** True only if the best lag clears the adjusted threshold. */
  bestIsSignificant: boolean;
}

/**
 * Correlates flow[t] against ret[t + lag]. Positive lag = flow leads price,
 * i.e. whale movement would be predictive. Negative lag = price leads flow,
 * i.e. whales are reacting, not causing.
 */
export function lagScan(flow: number[], ret: number[], maxLag: number): LagScan {
  const lags: LagResult[] = [];
  for (let lag = -maxLag; lag <= maxLag; lag++) {
    const xs: number[] = [];
    const ys: number[] = [];
    for (let t = 0; t < flow.length; t++) {
      const j = t + lag;
      if (j < 0 || j >= ret.length) continue;
      xs.push(flow[t]);
      ys.push(ret[j]);
    }
    if (xs.length < 8) continue;
    lags.push({ lag, ...correlate(xs, ys) });
  }

  const bonferroniAlpha = lags.length ? 0.05 / lags.length : 0.05;
  const best =
    lags.reduce<LagResult | null>(
      (acc, l) => (!acc || Math.abs(l.pearson) > Math.abs(acc.pearson) ? l : acc),
      null
    ) ?? null;

  return {
    lags,
    best,
    concurrent: lags.find((l) => l.lag === 0) ?? null,
    bonferroniAlpha,
    bestIsSignificant: Boolean(best && best.pValue < bonferroniAlpha),
  };
}

// --- Directional agreement ----------------------------------------------

export interface HitRate {
  /** Buckets where flow was non-zero and the next return was non-zero. */
  n: number;
  hits: number;
  rate: number;
  /** One-tailed binomial p-value against a fair coin. */
  pValue: number;
}

function logChoose(n: number, k: number): number {
  return logGamma(n + 1) - logGamma(k + 1) - logGamma(n - k + 1);
}

/** P(X >= k) for X ~ Binomial(n, 0.5). */
function binomialTailP(k: number, n: number): number {
  if (n === 0) return 1;
  let p = 0;
  for (let i = k; i <= n; i++) p += Math.exp(logChoose(n, i) + n * Math.log(0.5));
  return Math.min(1, p);
}

/**
 * How often the sign of whale flow matches the sign of the return `lag`
 * buckets later. More legible than r, and immune to outlier magnitude.
 */
export function directionalHitRate(flow: number[], ret: number[], lag: number): HitRate {
  let n = 0;
  let hits = 0;
  for (let t = 0; t < flow.length; t++) {
    const j = t + lag;
    if (j < 0 || j >= ret.length) continue;
    if (flow[t] === 0 || ret[j] === 0) continue;
    n++;
    if (Math.sign(flow[t]) === Math.sign(ret[j])) hits++;
  }
  return {
    n,
    hits,
    rate: n ? hits / n : 0,
    pValue: binomialTailP(Math.max(hits, n - hits), n),
  };
}

/** Population z-score of the last value against the preceding history. */
export function zScore(value: number, history: number[]): number {
  if (history.length < 3) return 0;
  const sd = stdDev(history);
  if (sd === 0) return 0;
  return (value - mean(history)) / sd;
}
