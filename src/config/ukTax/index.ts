/**
 * Versioned UK tax configuration — single source of truth for every
 * rate/threshold used by the finance calculators. Add new tax years by
 * creating a new file and prepending it to TAX_YEARS.
 */

import { TAX_YEAR_2025_26 } from "./2025-26";
import { TAX_YEAR_2026_27 } from "./2026-27";
import type { UkTaxYearConfig } from "./types";

export type {
  Class2NiConfig,
  Class4NiConfig,
  EmployeeNiConfig,
  StudentLoanPlan,
  StudentLoansConfig,
  TaxBand,
  UkTaxYearConfig,
} from "./types";

/** All configured tax years, newest (default) first. */
export const TAX_YEARS: UkTaxYearConfig[] = [TAX_YEAR_2026_27, TAX_YEAR_2025_26];

/** The default (current) tax year id. */
export const DEFAULT_TAX_YEAR_ID = TAX_YEARS[0].id;

export function getTaxYear(id: string): UkTaxYearConfig | undefined {
  return TAX_YEARS.find((year) => year.id === id);
}
