"use client";

import { NumberInput, type NumberInputProps } from "./NumberInput";

const CURRENCY_SYMBOLS = {
  GBP: "£",
  EUR: "€",
  USD: "$",
} as const;

export interface CurrencyInputProps extends NumberInputProps {
  /** Which currency symbol to show as the prefix. Defaults to GBP. */
  currency?: "GBP" | "EUR" | "USD";
}

export function CurrencyInput({
  currency = "GBP",
  prefix,
  ...rest
}: CurrencyInputProps) {
  return (
    <NumberInput {...rest} prefix={prefix ?? CURRENCY_SYMBOLS[currency]} />
  );
}
