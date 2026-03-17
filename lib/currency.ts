export const USD_TO_INR_RATE = 83.25;

export type CurrencyDisplayMode = "usd" | "inr";

export function convertUsdToInr(value: number) {
  return value * USD_TO_INR_RATE;
}

export function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}
