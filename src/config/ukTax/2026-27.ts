/**
 * UK tax year 2026-27 (6 April 2026 – 5 April 2027) — current year.
 *
 * Every figure below was verified against the sources listed on 2026-08-16
 * (see TAX_RESEARCH.md for the full audit trail):
 * - Income tax rUK: https://www.gov.uk/income-tax-rates and
 *   https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027
 * - PA taper: https://www.gov.uk/income-tax-rates/income-over-100000
 * - Scottish income tax: https://www.gov.uk/scottish-income-tax
 * - Employee NI: https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027
 * - Student loans (incl. first-ever Plan 5 deductions from 6 April 2026):
 *   https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027
 * - Self-employed NI: https://www.gov.uk/self-employed-national-insurance-rates
 *
 * Band `upTo` values are TAXABLE income (after the personal allowance):
 * - rUK basic-rate limit £37,700; additional rate above £125,140 taxable.
 * - Scotland: gross £16,537 / £29,526 / £43,662 / £75,000 minus PA £12,570
 *   → taxable £3,967 / £16,956 / £31,092 / £62,430; top rate above £125,140
 *   taxable (the £125,140 threshold is not PA-relative because the allowance
 *   is fully tapered away at that income).
 */

import type { UkTaxYearConfig } from "./types";

export const TAX_YEAR_2026_27: UkTaxYearConfig = {
  id: "2026-27",
  label: "2026/27 (6 Apr 2026 – 5 Apr 2027)",
  verified: true,
  lastVerified: "2026-08-16",
  sources: [
    "https://www.gov.uk/income-tax-rates",
    "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027",
    "https://www.gov.uk/income-tax-rates/income-over-100000",
    "https://www.gov.uk/scottish-income-tax",
    "https://www.gov.uk/self-employed-national-insurance-rates",
    "https://www.gov.uk/repaying-your-student-loan/what-you-pay",
  ],
  personalAllowance: 12_570,
  paTaperThreshold: 100_000,
  paTaperRate: 0.5,
  bands: {
    ruk: [
      { name: "Basic rate", rate: 0.2, upTo: 37_700 },
      { name: "Higher rate", rate: 0.4, upTo: 125_140 },
      { name: "Additional rate", rate: 0.45, upTo: null },
    ],
    scotland: [
      { name: "Starter rate", rate: 0.19, upTo: 3_967 },
      { name: "Scottish basic rate", rate: 0.2, upTo: 16_956 },
      { name: "Intermediate rate", rate: 0.21, upTo: 31_092 },
      { name: "Scottish higher rate", rate: 0.42, upTo: 62_430 },
      { name: "Advanced rate", rate: 0.45, upTo: 125_140 },
      { name: "Top rate", rate: 0.48, upTo: null },
    ],
  },
  employeeNi: {
    primaryThreshold: 12_570,
    upperEarningsLimit: 50_270,
    mainRate: 0.08,
    upperRate: 0.02,
  },
  studentLoans: {
    plan1: { threshold: 26_900, rate: 0.09 },
    plan2: { threshold: 29_385, rate: 0.09 },
    plan4: { threshold: 33_795, rate: 0.09 },
    // First-ever Plan 5 deductions began 6 April 2026.
    plan5: { threshold: 25_000, rate: 0.09 },
    postgrad: { threshold: 21_000, rate: 0.06 },
  },
  class4: {
    lowerProfitsLimit: 12_570,
    upperProfitsLimit: 50_270,
    mainRate: 0.06,
    upperRate: 0.02,
  },
  class2: {
    smallProfitsThreshold: 7_105,
    weeklyRate: 3.65,
    note: "Compulsory Class 2 was abolished from 6 April 2024. Profits at or above the small profits threshold receive a National Insurance credit automatically (treated as paid). Below the threshold you can pay Class 2 voluntarily at £3.65 a week to protect State Pension and benefit entitlement.",
  },
};
