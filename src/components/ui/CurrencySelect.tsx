"use client";

import { SelectInput } from "./SelectInput";
import {
  CURRENCY_OPTIONS,
  isSupportedCurrency,
  type SupportedCurrency,
} from "@/lib/currency";

export interface CurrencySelectProps {
  id: string;
  value: SupportedCurrency;
  onChange: (next: SupportedCurrency) => void;
  /** Defaults to "Currency". */
  label?: string;
  hint?: string;
}

/**
 * The site-wide currency picker. Changing it changes how amounts are
 * displayed; it never changes a calculated number, and it never converts
 * between currencies (no exchange rates are used anywhere on the site).
 */
export function CurrencySelect({
  id,
  value,
  onChange,
  label = "Currency",
  hint = "Changes how amounts are displayed. No conversion is applied.",
}: CurrencySelectProps) {
  return (
    <SelectInput
      id={id}
      label={label}
      value={value}
      onChange={(v) => {
        if (isSupportedCurrency(v)) onChange(v);
      }}
      options={CURRENCY_OPTIONS}
      hint={hint}
    />
  );
}
