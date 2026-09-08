import test from "node:test";
import assert from "node:assert/strict";
import {
  correlate,
  correlationPValue,
  directionalHitRate,
  lagScan,
  pearson,
  rank,
  spearman,
  zScore,
} from "../lib/stats.ts";

test("pearson matches a hand-computed value", () => {
  // Perfect positive and perfect negative are the anchors.
  assert.equal(pearson([1, 2, 3, 4], [2, 4, 6, 8]).toFixed(6), "1.000000");
  assert.equal(pearson([1, 2, 3, 4], [8, 6, 4, 2]).toFixed(6), "-1.000000");

  // Worked by hand: dx = [-2,-1,0,1,2], dy = [-2,0,1,0,1]
  // cov = 6, Sxx = 10, Syy = 6  ->  r = 6 / sqrt(60) = 0.7745967
  const r = pearson([1, 2, 3, 4, 5], [2, 4, 5, 4, 5]);
  assert.ok(Math.abs(r - 6 / Math.sqrt(60)) < 1e-12, `got ${r}`);
});

test("pearson is zero for orthogonal series and safe on constants", () => {
  assert.equal(pearson([1, 2, 3, 4], [1, 1, 1, 1]), 0);
  assert.equal(pearson([1], [1]), 0);
});

test("rank averages ties", () => {
  assert.deepEqual(rank([10, 20, 20, 30]), [1, 2.5, 2.5, 4]);
  assert.deepEqual(rank([5, 5, 5]), [2, 2, 2]);
});

test("spearman catches a monotonic but non-linear relationship", () => {
  const xs = [1, 2, 3, 4, 5, 6];
  const ys = xs.map((x) => Math.exp(x)); // monotonic, wildly non-linear
  assert.equal(spearman(xs, ys).toFixed(6), "1.000000");
  assert.ok(pearson(xs, ys) < 0.95, "pearson should be dragged down by curvature");
});

test("p-value behaves like Student's t", () => {
  // r = 0 over any n is maximally unsurprising.
  assert.equal(correlationPValue(0, 50).toFixed(4), "1.0000");
  // Known value: r = 0.5, n = 20 -> t = 2.4495, df = 18, two-tailed p ~ 0.0247
  const p = correlationPValue(0.5, 20);
  assert.ok(Math.abs(p - 0.0247) < 0.001, `got ${p}`);
  // Same r with more data is more significant.
  assert.ok(correlationPValue(0.5, 200) < correlationPValue(0.5, 20));
  // Sign must not matter.
  assert.equal(correlationPValue(-0.5, 20), correlationPValue(0.5, 20));
});

test("a fat tail is exactly what separates pearson from spearman", () => {
  // 19 points of pure noise plus one enormous outlier that lines up.
  const flow = [...Array(19).fill(0).map((_, i) => (i % 2 ? 1 : -1)), 1e9];
  const ret = [...Array(19).fill(0).map((_, i) => (i % 2 ? -0.01 : 0.01)), 0.5];
  const res = correlate(flow, ret);
  assert.ok(res.pearson > 0.9, "outlier dominates pearson");
  assert.ok(res.spearman < 0.5, "spearman resists it");
});

test("lagScan finds a planted lead and reports its sign", () => {
  // Flow at t drives the return at t+2, with noise everywhere else.
  const n = 200;
  const flow: number[] = [];
  for (let i = 0; i < n; i++) flow.push(Math.sin(i / 3) + Math.cos(i / 7));
  const ret = new Array(n).fill(0);
  for (let i = 0; i < n; i++) if (i + 2 < n) ret[i + 2] = flow[i] * 0.01;

  const scan = lagScan(flow, ret, 6);
  assert.equal(scan.best?.lag, 2, "flow should lead price by 2 buckets");
  assert.ok((scan.best?.pearson ?? 0) > 0.95);
  assert.ok(scan.bestIsSignificant);
  // 13 lags tested -> alpha is 0.05/13
  assert.ok(Math.abs(scan.bonferroniAlpha - 0.05 / 13) < 1e-9);
});

test("lagScan does not manufacture a signal from noise", () => {
  // Deterministic pseudo-random so the test cannot flake.
  let seed = 42;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648 - 0.5;
  };
  const flow = Array.from({ length: 300 }, rnd);
  const ret = Array.from({ length: 300 }, rnd);
  const scan = lagScan(flow, ret, 6);
  assert.equal(scan.bestIsSignificant, false, "unrelated series must not clear Bonferroni");
});

test("directionalHitRate ignores zero buckets and scores agreement", () => {
  const flow = [1, -1, 1, -1, 0, 0];
  const ret = [0.1, -0.1, 0.1, -0.1, 0.5, -0.5];
  const hr = directionalHitRate(flow, ret, 0);
  assert.equal(hr.n, 4, "zero-flow buckets are excluded");
  assert.equal(hr.hits, 4);
  assert.equal(hr.rate, 1);

  const opposite = directionalHitRate([1, 1, 1, 1], [-1, -1, -1, -1], 0);
  assert.equal(opposite.rate, 0);
  // A perfectly inverted relationship is just as unlikely as a perfect one.
  assert.ok(opposite.pValue < 0.15);
});

test("zScore needs history and survives a flat series", () => {
  assert.equal(zScore(10, [1, 2]), 0, "too little history");
  assert.equal(zScore(10, [5, 5, 5, 5]), 0, "zero variance must not divide by zero");
  assert.ok(zScore(100, [1, 2, 3, 4, 5]) > 3);
});
