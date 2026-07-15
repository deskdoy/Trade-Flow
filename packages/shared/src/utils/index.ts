export function formatCurrency(value: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercent(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function formatDecimal(value: number, precision = 4): string {
  return value.toFixed(precision);
}

export function generateId(prefix = "tf"): string {
  return `${prefix}_${Math.random().toString(36).substring(2, 11)}`;
}
