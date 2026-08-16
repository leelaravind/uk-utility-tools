/**
 * Credit card payoff engine — pure, deterministic, integer-pence arithmetic.
 *
 * INTEREST MODEL (documented approximation): the monthly interest rate is
 * APR% / 12. Real card issuers typically compound daily on the statement
 * balance and apply payments on specific dates, so actual figures will
 * differ slightly. Interest each month = round(balance × monthlyRate) in
 * pence, added before the payment is applied.
 *
 * The simulation is capped at MAX_MONTHS (600 = 50 years).
 */

export const MAX_MONTHS = 600;

export interface AmortisationRow {
  /** 1-based month number. */
  month: number;
  /** Payment actually made this month, pence. */
  paymentPence: number;
  interestPence: number;
  principalPence: number;
  /** Balance remaining after this month's payment, pence. */
  balancePence: number;
}

export interface PayoffSuccess {
  ok: true;
  months: number;
  totalPaidPence: number;
  totalInterestPence: number;
  /** The (usually smaller) final payment, pence. */
  finalPaymentPence: number;
  schedule: AmortisationRow[];
  /** Month of the final payment, "YYYY-MM" (first payment = 1 month from `today`). */
  payoffMonth: string;
  /** Set by requiredMonthlyPayment (mode B): the solved payment, pence. */
  monthlyPaymentPence?: number;
}

export interface PayoffFailure {
  ok: false;
  message: string;
  /** Interest accrued in the first month, pence (null if inputs invalid). */
  firstMonthInterestPence: number | null;
  /**
   * The monthly payment (pence) that would clear the balance within
   * MAX_MONTHS — the minimum viable payment to show the user (null if
   * inputs invalid).
   */
  suggestedMonthlyPence: number | null;
}

export type PayoffResult = PayoffSuccess | PayoffFailure;

export interface FixedPaymentInput {
  /** Current balance, £. */
  balance: number;
  /** Annual percentage rate, e.g. 24 for 24%. */
  aprPercent: number;
  /** Fixed monthly payment, £. */
  monthlyPayment: number;
}

export type RequiredPaymentResult =
  | (PayoffSuccess & { monthlyPaymentPence: number })
  | PayoffFailure;

export function toPence(pounds: number): number {
  return Math.round(pounds * 100);
}

/** Monthly rate as a decimal from an APR percentage (APR / 12 approximation). */
export function monthlyRateFromApr(aprPercent: number): number {
  return aprPercent / 100 / 12;
}

/** "YYYY-MM" for `monthsAhead` calendar months after `today` (local time). */
export function addMonthsIsoMonth(today: Date, monthsAhead: number): string {
  const total = today.getFullYear() * 12 + today.getMonth() + monthsAhead;
  const year = Math.floor(total / 12);
  const month = (total % 12) + 1;
  return `${year}-${String(month).padStart(2, "0")}`;
}

function invalid(message: string): PayoffFailure {
  return {
    ok: false,
    message,
    firstMonthInterestPence: null,
    suggestedMonthlyPence: null,
  };
}

/**
 * Mode A — fixed monthly payment. `today` anchors the projected payoff
 * month and must be supplied by the caller (keeps the function pure).
 */
export function simulatePayoff(
  input: FixedPaymentInput,
  today: Date,
): PayoffResult {
  const balancePence = toPence(input.balance);
  const paymentPence = toPence(input.monthlyPayment);
  const rate = monthlyRateFromApr(input.aprPercent);

  if (!Number.isFinite(balancePence) || balancePence <= 0) {
    return invalid("Enter a balance greater than zero.");
  }
  if (!Number.isFinite(rate) || rate < 0) {
    return invalid("Enter an APR of zero or more.");
  }
  if (!Number.isFinite(paymentPence) || paymentPence <= 0) {
    return invalid("Enter a monthly payment greater than zero.");
  }

  const firstMonthInterestPence = Math.round(balancePence * rate);
  if (rate > 0 && paymentPence <= firstMonthInterestPence) {
    return {
      ok: false,
      message:
        "This payment never clears the balance — it does not even cover the first month's interest, so the balance would grow instead of shrinking.",
      firstMonthInterestPence,
      suggestedMonthlyPence: requiredPaymentPence(
        balancePence,
        rate,
        MAX_MONTHS,
      ),
    };
  }

  const schedule: AmortisationRow[] = [];
  let balance = balancePence;
  let totalPaid = 0;
  let totalInterest = 0;

  for (let month = 1; month <= MAX_MONTHS; month++) {
    const interest = Math.round(balance * rate);
    const owed = balance + interest;

    if (paymentPence >= owed) {
      // Final, smaller payment clears everything.
      totalPaid += owed;
      totalInterest += interest;
      schedule.push({
        month,
        paymentPence: owed,
        interestPence: interest,
        principalPence: balance,
        balancePence: 0,
      });
      return {
        ok: true,
        months: month,
        totalPaidPence: totalPaid,
        totalInterestPence: totalInterest,
        finalPaymentPence: owed,
        schedule,
        payoffMonth: addMonthsIsoMonth(today, month),
      };
    }

    balance = owed - paymentPence;
    totalPaid += paymentPence;
    totalInterest += interest;
    schedule.push({
      month,
      paymentPence,
      interestPence: interest,
      principalPence: paymentPence - interest,
      balancePence: balance,
    });
  }

  return {
    ok: false,
    message: `This payment would not clear the balance within ${MAX_MONTHS / 12} years.`,
    firstMonthInterestPence,
    suggestedMonthlyPence: requiredPaymentPence(balancePence, rate, MAX_MONTHS),
  };
}

/**
 * Annuity-formula payment (pence, rounded up) to clear `balancePence` in
 * exactly `months` months at monthly `rate`.
 */
function requiredPaymentPence(
  balancePence: number,
  rate: number,
  months: number,
): number {
  if (rate === 0) {
    return Math.ceil(balancePence / months);
  }
  const exact = (balancePence * rate) / (1 - Math.pow(1 + rate, -months));
  return Math.ceil(exact);
}

/**
 * Mode B — solve for the monthly payment that clears the balance within
 * `targetMonths`, then verify by running the simulation (bumping by a penny
 * if integer rounding ever leaves it a month short).
 */
export function requiredMonthlyPayment(
  input: { balance: number; aprPercent: number; targetMonths: number },
  today: Date,
): RequiredPaymentResult {
  const balancePence = toPence(input.balance);
  const rate = monthlyRateFromApr(input.aprPercent);
  const months = Math.floor(input.targetMonths);

  if (!Number.isFinite(balancePence) || balancePence <= 0) {
    return invalid("Enter a balance greater than zero.");
  }
  if (!Number.isFinite(rate) || rate < 0) {
    return invalid("Enter an APR of zero or more.");
  }
  if (!Number.isFinite(months) || months < 1 || months > MAX_MONTHS) {
    return invalid(`Enter a target between 1 and ${MAX_MONTHS} months.`);
  }

  let paymentPence = requiredPaymentPence(balancePence, rate, months);

  // Verify against the actual pence-rounded simulation; a couple of penny
  // bumps is always enough because the formula is exact to < 1p.
  for (let attempt = 0; attempt < 4; attempt++) {
    const sim = simulatePayoff(
      {
        balance: balancePence / 100,
        aprPercent: input.aprPercent,
        monthlyPayment: paymentPence / 100,
      },
      today,
    );
    if (sim.ok && sim.months <= months) {
      return { ...sim, monthlyPaymentPence: paymentPence };
    }
    paymentPence += 1;
  }

  return invalid(
    "Could not find a payment for this target — try more months.",
  );
}
