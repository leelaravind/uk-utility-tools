/**
 * Self-employed profit estimator — pure functions over the versioned tax
 * config. Illustrative only, never tax advice.
 *
 * ASSUMPTIONS (surfaced to users on the page):
 * - The illustrative tax section assumes self-employment is the person's
 *   ONLY income, uses England/Wales/NI (rUK) income tax bands, and applies
 *   the standard personal allowance with the £100,000 taper.
 * - Class 4 NI: mainRate between the lower and upper profits limits,
 *   upperRate above (annual basis, integer pence, rounded to the penny).
 * - Class 2: compulsory Class 2 was abolished from April 2024. At or above
 *   the small profits threshold, NI credits are treated as paid at no cost;
 *   below it, a voluntary weekly rate is available — shown as information,
 *   never added to the tax bill.
 * - The £1,000 trading allowance alternative to expenses is explained on
 *   the page but not computed here.
 */

import type { UkTaxYearConfig } from "@/config/ukTax";
import {
  computeIncomeTax,
  toPence,
  toPounds,
  type BandBreakdownRow,
} from "./salary";

export type Period = "weekly" | "monthly" | "annual";

export interface SelfEmployedInput {
  /** Revenue for one `period`, £. */
  revenue: number;
  /** Allowable expenses for one `period`, £. */
  expenses: number;
  period: Period;
  /** Include the illustrative tax section (default true). */
  includeTax?: boolean;
}

export interface Class2Info {
  /** Profit at/above the small profits threshold — credit treated as paid. */
  treatedAsPaid: boolean;
  /** Profit below the threshold — voluntary contributions available. */
  voluntaryApplies: boolean;
  smallProfitsThreshold: number;
  weeklyRate: number;
  /** 52 × weekly rate, £ — the cost of a full voluntary year. */
  annualVoluntaryCost: number;
  note: string;
}

export interface SelfEmployedTaxEstimate {
  personalAllowance: number;
  taxableProfit: number;
  incomeTax: number;
  incomeTaxBands: BandBreakdownRow[];
  class4Ni: number;
  class2: Class2Info;
  /** Income tax + Class 4 (Class 2 voluntary is informational only). */
  totalTaxAndNi: number;
  postTaxProfit: number;
}

export interface SelfEmployedResult {
  taxYearId: string;
  annualRevenue: number;
  annualExpenses: number;
  /** Revenue − expenses; negative when expenses exceed revenue. */
  annualProfit: number;
  isLoss: boolean;
  /** Present when includeTax is not false. */
  tax?: SelfEmployedTaxEstimate;
}

const PERIODS_PER_YEAR: Record<Period, number> = {
  weekly: 52,
  monthly: 12,
  annual: 1,
};

function sanitise(n: number): number {
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Annualise a per-period amount, exact to the penny. */
export function annualise(amount: number, period: Period): number {
  return toPounds(toPence(sanitise(amount)) * PERIODS_PER_YEAR[period]);
}

/** Class 4 NI on annual profit, £ (0 for losses / profit below the LPL). */
export function computeClass4Ni(
  config: UkTaxYearConfig,
  annualProfit: number,
): number {
  const profitPence = toPence(sanitise(annualProfit));
  const lplPence = toPence(config.class4.lowerProfitsLimit);
  const uplPence = toPence(config.class4.upperProfitsLimit);

  const mainBand = Math.min(
    Math.max(0, profitPence - lplPence),
    Math.max(0, uplPence - lplPence),
  );
  const upperBand = Math.max(0, profitPence - uplPence);

  return toPounds(
    Math.round(mainBand * config.class4.mainRate) +
      Math.round(upperBand * config.class4.upperRate),
  );
}

export function computeSelfEmployed(
  config: UkTaxYearConfig,
  input: SelfEmployedInput,
): SelfEmployedResult {
  const annualRevenue = annualise(input.revenue, input.period);
  const annualExpenses = annualise(input.expenses, input.period);
  const profitPence = toPence(annualRevenue) - toPence(annualExpenses);
  const annualProfit = toPounds(profitPence);
  const isLoss = profitPence < 0;

  const result: SelfEmployedResult = {
    taxYearId: config.id,
    annualRevenue,
    annualExpenses,
    annualProfit,
    isLoss,
  };

  if (input.includeTax === false) {
    return result;
  }

  const profitForTax = Math.max(0, annualProfit);
  const incomeTax = computeIncomeTax(config, profitForTax, "ruk");
  const class4Ni = computeClass4Ni(config, profitForTax);

  const treatedAsPaid =
    profitForTax >= config.class2.smallProfitsThreshold;
  const class2: Class2Info = {
    treatedAsPaid,
    voluntaryApplies: !treatedAsPaid,
    smallProfitsThreshold: config.class2.smallProfitsThreshold,
    weeklyRate: config.class2.weeklyRate,
    annualVoluntaryCost: toPounds(toPence(config.class2.weeklyRate) * 52),
    note: config.class2.note,
  };

  const totalTaxAndNiPence =
    toPence(incomeTax.incomeTax) + toPence(class4Ni);

  result.tax = {
    personalAllowance: incomeTax.personalAllowance,
    taxableProfit: incomeTax.taxableIncome,
    incomeTax: incomeTax.incomeTax,
    incomeTaxBands: incomeTax.bands,
    class4Ni,
    class2,
    totalTaxAndNi: toPounds(totalTaxAndNiPence),
    postTaxProfit: toPounds(profitPence - totalTaxAndNiPence),
  };

  return result;
}
