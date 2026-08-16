/**
 * Versioned UK tax-year configuration types.
 *
 * All monetary values are ANNUAL POUNDS unless a field name says otherwise
 * (e.g. `weeklyRate`). Calculation engines convert to pence internally.
 *
 * Band model: income tax bands are expressed over TAXABLE income — income
 * after the (possibly tapered) personal allowance has been deducted. This is
 * how the bands are defined in statute; the familiar "gross" figures on
 * GOV.UK assume a full personal allowance. Expressing bands this way makes
 * the £100,000 personal-allowance taper compose correctly: for example the
 * rUK additional rate starts at £125,140 of taxable income, which equals
 * £125,140 gross only because the allowance is fully tapered away by then.
 */

export interface TaxBand {
  /** Display name, e.g. "Basic rate" or "Starter rate". */
  name: string;
  /** Marginal rate as a decimal, e.g. 0.20 for 20%. */
  rate: number;
  /**
   * Upper limit of taxable income (annual £) that this band applies up to,
   * cumulative from £0 of taxable income. `null` = no upper limit (top band).
   */
  upTo: number | null;
}

export interface StudentLoanPlan {
  /** Annual repayment threshold in £. */
  threshold: number;
  /** Repayment rate on income above the threshold, e.g. 0.09. */
  rate: number;
}

export interface EmployeeNiConfig {
  /** Annual primary threshold in £ (no employee NI below this). */
  primaryThreshold: number;
  /** Annual upper earnings limit in £. */
  upperEarningsLimit: number;
  /** Main rate between PT and UEL, e.g. 0.08. */
  mainRate: number;
  /** Rate above the UEL, e.g. 0.02. */
  upperRate: number;
}

export interface Class4NiConfig {
  /** Lower profits limit (annual £). */
  lowerProfitsLimit: number;
  /** Upper profits limit (annual £). */
  upperProfitsLimit: number;
  /** Main rate between LPL and UPL, e.g. 0.06. */
  mainRate: number;
  /** Rate above the UPL, e.g. 0.02. */
  upperRate: number;
}

export interface Class2NiConfig {
  /** Small profits threshold (annual £). */
  smallProfitsThreshold: number;
  /** Voluntary weekly rate in £ (e.g. 3.65). */
  weeklyRate: number;
  /** Human-readable note on the current Class 2 regime. */
  note: string;
}

export interface StudentLoansConfig {
  plan1: StudentLoanPlan;
  plan2: StudentLoanPlan;
  plan4: StudentLoanPlan;
  /**
   * Plan 5 — `null` for 2025-26: the first Plan 5 deductions only began on
   * 6 April 2026, so no Plan 5 repayments were taken through payroll in
   * 2025-26.
   */
  plan5: StudentLoanPlan | null;
  postgrad: StudentLoanPlan;
}

export interface UkTaxYearConfig {
  /** e.g. "2026-27". */
  id: string;
  /** Display label, e.g. "2026/27 (6 Apr 2026 – 5 Apr 2027)". */
  label: string;
  /** True only when every figure was checked against an authoritative source. */
  verified: boolean;
  /** Date the figures were last checked, YYYY-MM-DD. */
  lastVerified: string;
  /** Authoritative source URLs (GOV.UK unless stated). */
  sources: string[];
  /** Standard personal allowance (annual £). */
  personalAllowance: number;
  /** Income level above which the personal allowance tapers (annual £). */
  paTaperThreshold: number;
  /** Allowance lost per £1 of income over the threshold — 0.5 = £1 per £2. */
  paTaperRate: number;
  bands: {
    /** England, Wales and Northern Ireland ("rest of UK"). */
    ruk: TaxBand[];
    scotland: TaxBand[];
  };
  employeeNi: EmployeeNiConfig;
  studentLoans: StudentLoansConfig;
  class4: Class4NiConfig;
  class2: Class2NiConfig;
}
