import { describe, expect, it } from "vitest";

import { getTaxYear } from "@/config/ukTax";
import { annualise, computeClass4Ni, computeSelfEmployed } from "./selfEmployed";

const y2627 = getTaxYear("2026-27")!;
const y2526 = getTaxYear("2025-26")!;

describe("annualise", () => {
  it("weekly × 52, monthly × 12, annual × 1", () => {
    expect(annualise(1000, "weekly")).toBe(52000);
    expect(annualise(3000, "monthly")).toBe(36000);
    expect(annualise(45000, "annual")).toBe(45000);
  });

  it("is exact to the penny", () => {
    expect(annualise(10.55, "weekly")).toBe(548.6); // 1055p × 52 = 54,860p
  });

  it("treats invalid values as zero", () => {
    expect(annualise(-5, "monthly")).toBe(0);
    expect(annualise(Number.NaN, "weekly")).toBe(0);
  });
});

describe("computeClass4Ni — 2026-27 boundaries", () => {
  it("zero at or below the LPL (£12,570)", () => {
    expect(computeClass4Ni(y2627, 12570)).toBe(0);
    expect(computeClass4Ni(y2627, 8000)).toBe(0);
  });

  it("6% between LPL and UPL: £30,000 → £1,045.80", () => {
    expect(computeClass4Ni(y2627, 30000)).toBe(1045.8);
  });

  it("UPL boundary £50,270 → £2,262 exactly (6% of £37,700)", () => {
    expect(computeClass4Ni(y2627, 50270)).toBe(2262);
  });

  it("2% above UPL: £60,000 → £2,456.60", () => {
    expect(computeClass4Ni(y2627, 60000)).toBe(2456.6);
  });
});

describe("computeSelfEmployed — worked example (£3,000/mo revenue, £500/mo expenses, 2026-27)", () => {
  const r = computeSelfEmployed(y2627, {
    revenue: 3000,
    expenses: 500,
    period: "monthly",
  });

  it("annualises to £36,000 / £6,000 / £30,000 profit", () => {
    expect(r.annualRevenue).toBe(36000);
    expect(r.annualExpenses).toBe(6000);
    expect(r.annualProfit).toBe(30000);
    expect(r.isLoss).toBe(false);
  });

  it("income tax £3,486 (20% of £17,430, rUK bands)", () => {
    expect(r.tax?.incomeTax).toBe(3486);
    expect(r.tax?.taxableProfit).toBe(17430);
  });

  it("Class 4 £1,045.80; post-tax profit £25,468.20", () => {
    expect(r.tax?.class4Ni).toBe(1045.8);
    expect(r.tax?.totalTaxAndNi).toBe(4531.8);
    expect(r.tax?.postTaxProfit).toBe(25468.2);
  });

  it("Class 2 treated as paid (profit ≥ £7,105 SPT)", () => {
    expect(r.tax?.class2.treatedAsPaid).toBe(true);
    expect(r.tax?.class2.voluntaryApplies).toBe(false);
    expect(r.tax?.class2.smallProfitsThreshold).toBe(7105);
  });
});

describe("computeSelfEmployed — modes and edges", () => {
  it("profit-only mode omits the tax section", () => {
    const r = computeSelfEmployed(y2627, {
      revenue: 1000,
      expenses: 200,
      period: "weekly",
      includeTax: false,
    });
    expect(r.annualProfit).toBe(41600);
    expect(r.tax).toBeUndefined();
  });

  it("a loss produces negative profit and zero tax", () => {
    const r = computeSelfEmployed(y2627, {
      revenue: 10000,
      expenses: 15000,
      period: "annual",
    });
    expect(r.annualProfit).toBe(-5000);
    expect(r.isLoss).toBe(true);
    expect(r.tax?.incomeTax).toBe(0);
    expect(r.tax?.class4Ni).toBe(0);
    expect(r.tax?.postTaxProfit).toBe(-5000);
  });

  it("low profit (£5,000, 2026-27): voluntary Class 2 at £3.65/wk = £189.80/yr", () => {
    const r = computeSelfEmployed(y2627, {
      revenue: 5000,
      expenses: 0,
      period: "annual",
    });
    expect(r.tax?.class2.voluntaryApplies).toBe(true);
    expect(r.tax?.class2.weeklyRate).toBe(3.65);
    expect(r.tax?.class2.annualVoluntaryCost).toBe(189.8);
    expect(r.tax?.incomeTax).toBe(0); // below personal allowance
  });

  it("2025-26 config: SPT £6,845, voluntary £3.50/wk = £182.00/yr", () => {
    const r = computeSelfEmployed(y2526, {
      revenue: 6000,
      expenses: 0,
      period: "annual",
    });
    expect(r.tax?.class2.smallProfitsThreshold).toBe(6845);
    expect(r.tax?.class2.annualVoluntaryCost).toBe(182);
  });

  it("Class 4 boundary flows through: £50,270 profit → £2,262", () => {
    const r = computeSelfEmployed(y2627, {
      revenue: 50270,
      expenses: 0,
      period: "annual",
    });
    expect(r.tax?.class4Ni).toBe(2262);
    // income tax: 37,700 × 20% = 7,540
    expect(r.tax?.incomeTax).toBe(7540);
    expect(r.tax?.postTaxProfit).toBe(50270 - 7540 - 2262);
  });

  it("high profit uses the PA taper via the shared engine (£110,000)", () => {
    const r = computeSelfEmployed(y2627, {
      revenue: 110000,
      expenses: 0,
      period: "annual",
    });
    expect(r.tax?.personalAllowance).toBe(7570);
    expect(r.tax?.incomeTax).toBe(33432);
    // Class 4: 2,262 + (110,000 − 50,270) × 2% = 2,262 + 1,194.60
    expect(r.tax?.class4Ni).toBe(3456.6);
  });
});
