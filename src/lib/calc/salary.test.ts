import { describe, expect, it } from "vitest";

import { getTaxYear } from "@/config/ukTax";
import {
  computeEmployeeNi,
  computeIncomeTax,
  computeTakeHome,
  formatGBP,
  taperedPersonalAllowancePence,
  toPence,
  toPounds,
} from "./salary";

const y2627 = getTaxYear("2026-27")!;
const y2526 = getTaxYear("2025-26")!;

describe("config sanity", () => {
  it("exposes both tax years", () => {
    expect(y2627).toBeDefined();
    expect(y2526).toBeDefined();
    expect(y2627.verified).toBe(true);
    expect(y2526.verified).toBe(true);
  });

  it("plan 5 exists only in 2026-27", () => {
    expect(y2627.studentLoans.plan5).toEqual({ threshold: 25000, rate: 0.09 });
    expect(y2526.studentLoans.plan5).toBeNull();
  });
});

describe("money helpers", () => {
  it("converts pounds <-> pence", () => {
    expect(toPence(1394.4)).toBe(139440);
    expect(toPounds(139440)).toBe(1394.4);
    expect(toPence(0.005)).toBe(1); // rounds to nearest penny
  });

  it("formats GBP", () => {
    expect(formatGBP(1394.4)).toBe("£1,394.40");
    expect(formatGBP(0)).toBe("£0.00");
  });
});

describe("personal allowance taper", () => {
  it("full allowance at or below £100,000", () => {
    expect(taperedPersonalAllowancePence(y2627, toPence(100000))).toBe(
      toPence(12570),
    );
    expect(taperedPersonalAllowancePence(y2627, toPence(30000))).toBe(
      toPence(12570),
    );
  });

  it("£1 lost per £2 over: £100,002 → £12,569", () => {
    expect(taperedPersonalAllowancePence(y2627, toPence(100002))).toBe(
      toPence(12569),
    );
  });

  it("£110,000 → PA £7,570", () => {
    expect(taperedPersonalAllowancePence(y2627, toPence(110000))).toBe(
      toPence(7570),
    );
  });

  it("fully gone at £125,140 and beyond", () => {
    expect(taperedPersonalAllowancePence(y2627, toPence(125140))).toBe(0);
    expect(taperedPersonalAllowancePence(y2627, toPence(200000))).toBe(0);
  });
});

describe("computeIncomeTax — rUK 2026-27", () => {
  it("zero below the personal allowance", () => {
    const r = computeIncomeTax(y2627, 10000, "ruk");
    expect(r.incomeTax).toBe(0);
    expect(r.taxableIncome).toBe(0);
    expect(r.bands).toEqual([]);
  });

  it("zero at exactly £12,570", () => {
    expect(computeIncomeTax(y2627, 12570, "ruk").incomeTax).toBe(0);
  });

  it("£13,570 → £200 (20% of £1,000)", () => {
    const r = computeIncomeTax(y2627, 13570, "ruk");
    expect(r.incomeTax).toBe(200);
    expect(r.bands).toEqual([
      { name: "Basic rate", rate: 0.2, amount: 1000, tax: 200 },
    ]);
  });

  it("basic-rate ceiling at £50,270 gross → £7,540", () => {
    const r = computeIncomeTax(y2627, 50270, "ruk");
    expect(r.taxableIncome).toBe(37700);
    expect(r.incomeTax).toBe(7540);
    expect(r.bands).toHaveLength(1);
  });

  it("£60,000 → £11,432 (7,540 basic + 3,892 higher)", () => {
    const r = computeIncomeTax(y2627, 60000, "ruk");
    expect(r.incomeTax).toBe(11432);
    expect(r.bands).toEqual([
      { name: "Basic rate", rate: 0.2, amount: 37700, tax: 7540 },
      { name: "Higher rate", rate: 0.4, amount: 9730, tax: 3892 },
    ]);
  });

  it("£110,000 (taper region) → PA £7,570, tax £33,432", () => {
    const r = computeIncomeTax(y2627, 110000, "ruk");
    expect(r.personalAllowance).toBe(7570);
    expect(r.taxableIncome).toBe(102430);
    // 37,700 × 20% + 64,730 × 40% = 7,540 + 25,892
    expect(r.incomeTax).toBe(33432);
  });

  it("£125,140 → PA £0, tax £42,516, no additional-rate row yet", () => {
    const r = computeIncomeTax(y2627, 125140, "ruk");
    expect(r.personalAllowance).toBe(0);
    expect(r.taxableIncome).toBe(125140);
    // 37,700 × 20% + 87,440 × 40% = 7,540 + 34,976
    expect(r.incomeTax).toBe(42516);
    expect(r.bands).toHaveLength(2);
  });

  it("£130,000 → £44,703 with 45% row", () => {
    const r = computeIncomeTax(y2627, 130000, "ruk");
    // 7,540 + 34,976 + 4,860 × 45% (2,187)
    expect(r.incomeTax).toBe(44703);
    expect(r.bands[2]).toEqual({
      name: "Additional rate",
      rate: 0.45,
      amount: 4860,
      tax: 2187,
    });
  });
});

describe("computeIncomeTax — Scotland", () => {
  it("2026-27 £30,000 → £3,451.07 across starter/basic/intermediate", () => {
    const r = computeIncomeTax(y2627, 30000, "scotland");
    // 3,967 × 19% = 753.73; 12,989 × 20% = 2,597.80; 474 × 21% = 99.54
    expect(r.bands).toEqual([
      { name: "Starter rate", rate: 0.19, amount: 3967, tax: 753.73 },
      { name: "Scottish basic rate", rate: 0.2, amount: 12989, tax: 2597.8 },
      { name: "Intermediate rate", rate: 0.21, amount: 474, tax: 99.54 },
    ]);
    expect(r.incomeTax).toBe(3451.07);
  });

  it("2026-27 £30,000: Scotland pays £34.93 less than rUK", () => {
    const scot = computeIncomeTax(y2627, 30000, "scotland").incomeTax;
    const ruk = computeIncomeTax(y2627, 30000, "ruk").incomeTax;
    expect(Math.round((ruk - scot) * 100) / 100).toBe(34.93);
  });

  it("2025-26 £20,000 uses the smaller starter band (£2,827)", () => {
    const r = computeIncomeTax(y2526, 20000, "scotland");
    // 2,827 × 19% = 537.13; 4,603 × 20% = 920.60
    expect(r.incomeTax).toBe(1457.73);
    expect(r.bands).toEqual([
      { name: "Starter rate", rate: 0.19, amount: 2827, tax: 537.13 },
      { name: "Scottish basic rate", rate: 0.2, amount: 4603, tax: 920.6 },
    ]);
  });

  it("2026-27 £50,000: Scotland pays more than rUK", () => {
    const scot = computeIncomeTax(y2627, 50000, "scotland").incomeTax;
    const ruk = computeIncomeTax(y2627, 50000, "ruk").incomeTax;
    // Scotland: 753.73 + 2,597.80 + 14,136 × 21% (2,968.56) + 6,338 × 42% (2,661.96)
    expect(scot).toBe(8982.05);
    expect(ruk).toBe(7486);
  });
});

describe("computeEmployeeNi", () => {
  it("zero at or below the primary threshold", () => {
    expect(computeEmployeeNi(y2627, 12570)).toBe(0);
    expect(computeEmployeeNi(y2627, 10000)).toBe(0);
  });

  it("8% between PT and UEL: £30,000 → £1,394.40", () => {
    expect(computeEmployeeNi(y2627, 30000)).toBe(1394.4);
  });

  it("UEL boundary: £50,270 → £3,016 exactly", () => {
    expect(computeEmployeeNi(y2627, 50270)).toBe(3016);
  });

  it("2% above UEL: £60,000 → £3,210.60", () => {
    expect(computeEmployeeNi(y2627, 60000)).toBe(3210.6);
  });
});

describe("computeTakeHome — worked example 1: £30,000 rUK 2026-27", () => {
  const r = computeTakeHome(y2627, { grossAnnual: 30000, region: "ruk" });

  it("income tax £3,486", () => {
    expect(r.incomeTax).toBe(3486);
  });
  it("NI £1,394.40", () => {
    expect(r.nationalInsurance).toBe(1394.4);
  });
  it("take-home £25,119.60 / £2,093.30 monthly / £483.07 weekly", () => {
    expect(r.takeHome.annual).toBe(25119.6);
    expect(r.takeHome.monthly).toBe(2093.3);
    expect(r.takeHome.weekly).toBe(483.07);
  });
  it("default pattern daily £96.61 (5 days), hourly £12.88 (37.5 h)", () => {
    expect(r.workingPattern).toEqual({ daysPerWeek: 5, hoursPerWeek: 37.5 });
    expect(r.takeHome.daily).toBe(96.61);
    expect(r.takeHome.hourly).toBe(12.88);
  });
  it("total deductions £4,880.40", () => {
    expect(r.totalDeductions).toBe(4880.4);
  });
});

describe("computeTakeHome — worked example 2: £60,000 rUK 2026-27", () => {
  const r = computeTakeHome(y2627, { grossAnnual: 60000, region: "ruk" });

  it("income tax £11,432, NI £3,210.60, take-home £45,357.40", () => {
    expect(r.incomeTax).toBe(11432);
    expect(r.nationalInsurance).toBe(3210.6);
    expect(r.takeHome.annual).toBe(45357.4);
  });
});

describe("computeTakeHome — edges and options", () => {
  it("below PA: £10,000 → no deductions at all", () => {
    const r = computeTakeHome(y2627, { grossAnnual: 10000, region: "ruk" });
    expect(r.incomeTax).toBe(0);
    expect(r.nationalInsurance).toBe(0);
    expect(r.takeHome.annual).toBe(10000);
  });

  it("PA fully gone at £125,140: tax £42,516, NI £4,513.40", () => {
    const r = computeTakeHome(y2627, { grossAnnual: 125140, region: "ruk" });
    expect(r.personalAllowance).toBe(0);
    expect(r.incomeTax).toBe(42516);
    // 3,016 + (125,140 − 50,270) × 2% = 3,016 + 1,497.40
    expect(r.nationalInsurance).toBe(4513.4);
  });

  it("percent pension: £40,000 at 5% → pension £2,000, tax £5,086, NI unchanged", () => {
    const r = computeTakeHome(y2627, {
      grossAnnual: 40000,
      region: "ruk",
      pension: { type: "percent", value: 5 },
    });
    expect(r.pensionAnnual).toBe(2000);
    expect(r.incomeTax).toBe(5086); // (38,000 − 12,570) × 20%
    expect(r.nationalInsurance).toBe(2194.4); // NI still on £40,000
    expect(r.takeHome.annual).toBe(30719.6);
  });

  it("amount pension: £40,000 with £3,000 → tax £4,886", () => {
    const r = computeTakeHome(y2627, {
      grossAnnual: 40000,
      region: "ruk",
      pension: { type: "amount", value: 3000 },
    });
    expect(r.pensionAnnual).toBe(3000);
    expect(r.incomeTax).toBe(4886);
    expect(r.takeHome.annual).toBe(29919.6);
  });

  it("pension restores the tapered PA: £110,000 with £10,000 pension", () => {
    const r = computeTakeHome(y2627, {
      grossAnnual: 110000,
      region: "ruk",
      pension: { type: "amount", value: 10000 },
    });
    expect(r.personalAllowance).toBe(12570); // income for tax = £100,000
    expect(r.incomeTax).toBe(27432); // 7,540 + 49,730 × 40%
    expect(r.nationalInsurance).toBe(4210.6); // NI still on gross
  });

  it("pension amount above gross is capped with a warning", () => {
    const r = computeTakeHome(y2627, {
      grossAnnual: 10000,
      region: "ruk",
      pension: { type: "amount", value: 20000 },
    });
    expect(r.pensionAnnual).toBe(10000);
    expect(r.takeHome.annual).toBe(0);
    expect(r.warnings.length).toBeGreaterThan(0);
  });

  it("custom working pattern: 4 days / 30 h on £30,000", () => {
    const r = computeTakeHome(y2627, {
      grossAnnual: 30000,
      region: "ruk",
      workingPattern: { daysPerWeek: 4, hoursPerWeek: 30 },
    });
    expect(r.takeHome.daily).toBe(120.77);
    expect(r.takeHome.hourly).toBe(16.1);
  });

  it("invalid gross (negative / NaN) is treated as zero, not thrown", () => {
    expect(
      computeTakeHome(y2627, { grossAnnual: -5, region: "ruk" }).takeHome
        .annual,
    ).toBe(0);
    expect(
      computeTakeHome(y2627, { grossAnnual: Number.NaN, region: "ruk" })
        .takeHome.annual,
    ).toBe(0);
  });
});

describe("student loans", () => {
  it("plan 1 2026-27: £30,000 → £279 (9% of £3,100)", () => {
    const r = computeTakeHome(y2627, {
      grossAnnual: 30000,
      region: "ruk",
      studentPlan: "plan1",
    });
    expect(r.studentLoan).toBe(279);
  });

  it("plan 1 2025-26 uses the lower £26,065 threshold: £30,000 → £354.15", () => {
    const r = computeTakeHome(y2526, {
      grossAnnual: 30000,
      region: "ruk",
      studentPlan: "plan1",
    });
    expect(r.studentLoan).toBe(354.15);
  });

  it("plan 2 2026-27: zero at the £29,385 threshold, 9p per extra £1 above", () => {
    const at = computeTakeHome(y2627, {
      grossAnnual: 29385,
      region: "ruk",
      studentPlan: "plan2",
    });
    expect(at.studentLoan).toBe(0);
    const above = computeTakeHome(y2627, {
      grossAnnual: 29485,
      region: "ruk",
      studentPlan: "plan2",
    });
    expect(above.studentLoan).toBe(9);
  });

  it("plan 4 2026-27: £40,000 → £558.45 (9% of £6,205)", () => {
    const r = computeTakeHome(y2627, {
      grossAnnual: 40000,
      region: "ruk",
      studentPlan: "plan4",
    });
    expect(r.studentLoan).toBe(558.45);
  });

  it("plan 5 2026-27: £30,000 → £450 (9% of £5,000)", () => {
    const r = computeTakeHome(y2627, {
      grossAnnual: 30000,
      region: "ruk",
      studentPlan: "plan5",
    });
    expect(r.studentLoan).toBe(450);
  });

  it("plan 5 2025-26: no deduction, explanatory warning instead", () => {
    const r = computeTakeHome(y2526, {
      grossAnnual: 30000,
      region: "ruk",
      studentPlan: "plan5",
    });
    expect(r.studentLoan).toBe(0);
    expect(r.warnings.some((w) => w.includes("Plan 5"))).toBe(true);
  });

  it("postgrad alone: £40,000 → £1,140 (6% of £19,000)", () => {
    const r = computeTakeHome(y2627, {
      grossAnnual: 40000,
      region: "ruk",
      postgradLoan: true,
    });
    expect(r.postgradLoan).toBe(1140);
    expect(r.studentLoan).toBe(0);
  });

  it("plan 2 + postgrad both deduct simultaneously at £40,000", () => {
    const r = computeTakeHome(y2627, {
      grossAnnual: 40000,
      region: "ruk",
      studentPlan: "plan2",
      postgradLoan: true,
    });
    expect(r.studentLoan).toBe(955.35); // 9% of £10,615
    expect(r.postgradLoan).toBe(1140); // 6% of £19,000
    // £40,000 − 5,486 IT − 2,194.40 NI − 955.35 − 1,140
    expect(r.incomeTax).toBe(5486);
    expect(r.takeHome.annual).toBe(30224.25);
  });
});
