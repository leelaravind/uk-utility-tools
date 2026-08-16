/**
 * UK take-home pay engine — pure, deterministic functions over a versioned
 * tax-year config. All internal arithmetic is in integer pence.
 *
 * KEY ASSUMPTIONS (documented for users in the salary page):
 *
 * 1. PENSION = NET-PAY ARRANGEMENT. Pension contributions reduce taxable
 *    income for INCOME TAX only. They do NOT reduce National Insurance and
 *    do NOT reduce the income used for student-loan repayments. (Salary
 *    sacrifice — which does reduce NI — and relief-at-source schemes behave
 *    differently and are not modelled.) Because a net-pay contribution
 *    reduces adjusted net income, the £100,000 personal-allowance taper is
 *    applied to income AFTER the pension contribution.
 *
 * 2. PERSONAL ALLOWANCE TAPER: the allowance falls by £1 for every £2 of
 *    income over the taper threshold (£100,000), reaching £0 at £125,140.
 *
 * 3. NATIONAL INSURANCE is employee Class 1, category A, calculated on an
 *    ANNUAL basis on gross pay: mainRate between the primary threshold and
 *    upper earnings limit, upperRate above. Real payroll calculates NI per
 *    pay period, so actual deductions can differ slightly. NI thresholds and
 *    rates are UK-wide — Scotland only differs on income tax.
 *
 * 4. STUDENT LOANS deduct plan-rate % of GROSS income above the plan
 *    threshold (annual basis). An undergraduate plan and the postgraduate
 *    loan can both apply at the same time. Payroll rounds per pay period, so
 *    real deductions can differ by small amounts.
 *
 * 5. ROUNDING: each deduction is rounded to the nearest penny. Monthly /
 *    weekly / daily / hourly figures are the annual figure divided down and
 *    rounded to the nearest penny — they are illustrative averages.
 */

import type { TaxBand, UkTaxYearConfig } from "@/config/ukTax";

export type Region = "ruk" | "scotland";
export type StudentPlanId = "plan1" | "plan2" | "plan4" | "plan5" | "none";
export type PayFrequency = "annual" | "monthly" | "weekly";

export interface PensionInput {
  type: "percent" | "amount";
  /** Percent of gross (e.g. 5) or annual £ amount (e.g. 2000). */
  value: number;
}

export interface WorkingPattern {
  daysPerWeek: number;
  hoursPerWeek: number;
}

export interface SalaryInput {
  /** Gross annual salary in £. */
  grossAnnual: number;
  region: Region;
  pension?: PensionInput;
  studentPlan?: StudentPlanId;
  postgradLoan?: boolean;
  /** Used only for the daily/hourly take-home figures. */
  workingPattern?: Partial<WorkingPattern>;
}

export interface BandBreakdownRow {
  name: string;
  /** Marginal rate as a decimal, e.g. 0.2. */
  rate: number;
  /** £ of taxable income falling in this band. */
  amount: number;
  /** £ of tax charged by this band. */
  tax: number;
}

export interface IncomeTaxResult {
  /** Personal allowance actually granted after tapering, £. */
  personalAllowance: number;
  /** Taxable income after allowance, £. */
  taxableIncome: number;
  /** Total income tax, £. */
  incomeTax: number;
  /** Per-band breakdown (only bands with a non-zero amount). */
  bands: BandBreakdownRow[];
}

export interface TakeHomeBreakdown {
  annual: number;
  monthly: number;
  weekly: number;
  daily: number;
  hourly: number;
}

export interface SalaryResult {
  taxYearId: string;
  region: Region;
  grossAnnual: number;
  pensionAnnual: number;
  personalAllowance: number;
  taxableIncome: number;
  incomeTax: number;
  incomeTaxBands: BandBreakdownRow[];
  nationalInsurance: number;
  studentLoan: number;
  postgradLoan: number;
  totalDeductions: number;
  takeHome: TakeHomeBreakdown;
  workingPattern: WorkingPattern;
  warnings: string[];
}

export const DEFAULT_WORKING_PATTERN: WorkingPattern = {
  daysPerWeek: 5,
  hoursPerWeek: 37.5,
};

/** Convert pounds to integer pence (nearest penny). */
export function toPence(pounds: number): number {
  return Math.round(pounds * 100);
}

/** Convert integer pence back to a pounds number (2 dp exact). */
export function toPounds(pence: number): number {
  return Math.round(pence) / 100;
}

/** Format a pounds amount as GBP currency, e.g. 1394.4 → "£1,394.40". */
export function formatGBP(pounds: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(pounds);
}

function clampNonNegative(n: number): number {
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * Personal allowance in pence after the £1-per-£2 taper, based on income
 * for tax purposes (gross minus net-pay pension) in pence.
 */
export function taperedPersonalAllowancePence(
  config: UkTaxYearConfig,
  incomeForTaperPence: number,
): number {
  const paPence = toPence(config.personalAllowance);
  const thresholdPence = toPence(config.paTaperThreshold);
  const excess = Math.max(0, incomeForTaperPence - thresholdPence);
  const reduction = Math.round(excess * config.paTaperRate);
  return Math.max(0, paPence - reduction);
}

/**
 * Income tax on `incomeForTaxPounds` (already net of any net-pay pension)
 * for a region, including the personal-allowance taper and a per-band
 * breakdown. Pure; used by both the salary and self-employed calculators.
 */
export function computeIncomeTax(
  config: UkTaxYearConfig,
  incomeForTaxPounds: number,
  region: Region,
): IncomeTaxResult {
  const incomePence = toPence(clampNonNegative(incomeForTaxPounds));
  const paPence = taperedPersonalAllowancePence(config, incomePence);
  const taxablePence = Math.max(0, incomePence - paPence);

  const bands: TaxBand[] = config.bands[region];
  const rows: BandBreakdownRow[] = [];
  let totalTaxPence = 0;
  let previousUpperPence = 0;

  for (const band of bands) {
    const upperPence =
      band.upTo === null ? Number.POSITIVE_INFINITY : toPence(band.upTo);
    const amountPence =
      Math.min(taxablePence, upperPence) - previousUpperPence;
    if (amountPence > 0) {
      const taxPence = Math.round(amountPence * band.rate);
      totalTaxPence += taxPence;
      rows.push({
        name: band.name,
        rate: band.rate,
        amount: toPounds(amountPence),
        tax: toPounds(taxPence),
      });
    }
    if (upperPence >= taxablePence) break;
    previousUpperPence = upperPence;
  }

  return {
    personalAllowance: toPounds(paPence),
    taxableIncome: toPounds(taxablePence),
    incomeTax: toPounds(totalTaxPence),
    bands: rows,
  };
}

/**
 * Employee Class 1 NI (category A) on an annual basis, in £.
 * UK-wide — identical for Scotland and the rest of the UK.
 */
export function computeEmployeeNi(
  config: UkTaxYearConfig,
  grossAnnualPounds: number,
): number {
  const grossPence = toPence(clampNonNegative(grossAnnualPounds));
  const ptPence = toPence(config.employeeNi.primaryThreshold);
  const uelPence = toPence(config.employeeNi.upperEarningsLimit);

  const mainBandPence = Math.min(
    Math.max(0, grossPence - ptPence),
    Math.max(0, uelPence - ptPence),
  );
  const upperBandPence = Math.max(0, grossPence - uelPence);

  const niPence =
    Math.round(mainBandPence * config.employeeNi.mainRate) +
    Math.round(upperBandPence * config.employeeNi.upperRate);
  return toPounds(niPence);
}

/** Repayment for one loan plan: rate % of gross above the threshold, in £. */
function loanRepaymentPounds(
  grossPence: number,
  thresholdPounds: number,
  rate: number,
): number {
  const overPence = Math.max(0, grossPence - toPence(thresholdPounds));
  return toPounds(Math.round(overPence * rate));
}

/**
 * Full take-home computation. Pure — pass the tax-year config explicitly.
 * Invalid numeric inputs are clamped to zero rather than throwing; the UI
 * is responsible for validation messages.
 */
export function computeTakeHome(
  config: UkTaxYearConfig,
  input: SalaryInput,
): SalaryResult {
  const warnings: string[] = [];
  const grossAnnual = clampNonNegative(input.grossAnnual);
  const grossPence = toPence(grossAnnual);

  // --- Pension (net-pay arrangement — see module header) ---
  let pensionPence = 0;
  if (input.pension && Number.isFinite(input.pension.value)) {
    if (input.pension.type === "percent") {
      const pct = Math.min(Math.max(input.pension.value, 0), 100);
      pensionPence = Math.round((grossPence * pct) / 100);
    } else {
      pensionPence = Math.min(
        toPence(clampNonNegative(input.pension.value)),
        grossPence,
      );
      if (toPence(input.pension.value) > grossPence) {
        warnings.push(
          "Pension contribution was capped at your gross salary.",
        );
      }
    }
  }

  // --- Income tax on gross minus pension ---
  const incomeForTaxPounds = toPounds(grossPence - pensionPence);
  const tax = computeIncomeTax(config, incomeForTaxPounds, input.region);

  // --- National Insurance on full gross (pension does not reduce NI) ---
  const nationalInsurance = computeEmployeeNi(config, grossAnnual);

  // --- Student loans on full gross ---
  let studentLoan = 0;
  const plan = input.studentPlan ?? "none";
  if (plan !== "none") {
    const planConfig = config.studentLoans[plan];
    if (planConfig) {
      studentLoan = loanRepaymentPounds(
        grossPence,
        planConfig.threshold,
        planConfig.rate,
      );
    } else {
      warnings.push(
        `Plan 5 repayments did not apply in the ${config.id} tax year — the first Plan 5 deductions began on 6 April 2026, so no student loan has been deducted.`,
      );
    }
  }

  let postgradLoan = 0;
  if (input.postgradLoan) {
    postgradLoan = loanRepaymentPounds(
      grossPence,
      config.studentLoans.postgrad.threshold,
      config.studentLoans.postgrad.rate,
    );
  }

  // --- Totals (assemble in pence for exactness) ---
  const incomeTaxPence = toPence(tax.incomeTax);
  const niPence = toPence(nationalInsurance);
  const studentLoanPence = toPence(studentLoan);
  const postgradPence = toPence(postgradLoan);
  const deductionsPence =
    incomeTaxPence + niPence + pensionPence + studentLoanPence + postgradPence;
  const takeHomeAnnualPence = grossPence - deductionsPence;

  // --- Working pattern for daily/hourly ---
  const daysPerWeek =
    input.workingPattern?.daysPerWeek !== undefined &&
    Number.isFinite(input.workingPattern.daysPerWeek) &&
    input.workingPattern.daysPerWeek > 0
      ? input.workingPattern.daysPerWeek
      : DEFAULT_WORKING_PATTERN.daysPerWeek;
  const hoursPerWeek =
    input.workingPattern?.hoursPerWeek !== undefined &&
    Number.isFinite(input.workingPattern.hoursPerWeek) &&
    input.workingPattern.hoursPerWeek > 0
      ? input.workingPattern.hoursPerWeek
      : DEFAULT_WORKING_PATTERN.hoursPerWeek;

  const weeklyPence = takeHomeAnnualPence / 52;
  const takeHome: TakeHomeBreakdown = {
    annual: toPounds(takeHomeAnnualPence),
    monthly: toPounds(takeHomeAnnualPence / 12),
    weekly: toPounds(weeklyPence),
    daily: toPounds(weeklyPence / daysPerWeek),
    hourly: toPounds(weeklyPence / hoursPerWeek),
  };

  return {
    taxYearId: config.id,
    region: input.region,
    grossAnnual: toPounds(grossPence),
    pensionAnnual: toPounds(pensionPence),
    personalAllowance: tax.personalAllowance,
    taxableIncome: tax.taxableIncome,
    incomeTax: tax.incomeTax,
    incomeTaxBands: tax.bands,
    nationalInsurance,
    studentLoan,
    postgradLoan,
    totalDeductions: toPounds(deductionsPence),
    takeHome,
    workingPattern: { daysPerWeek, hoursPerWeek },
    warnings,
  };
}
