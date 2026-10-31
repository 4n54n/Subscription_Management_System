export interface CurrencyOption {
  code: string;
  label: string;
  symbol: string;
}

export const CURRENCY_OPTIONS: CurrencyOption[] = [
  { code: 'INR', label: 'INR (\u20B9)', symbol: '\u20B9' },
  { code: 'USD', label: 'USD ($)', symbol: '$' },
  { code: 'EUR', label: 'EUR (\u20AC)', symbol: '\u20AC' },
  { code: 'GBP', label: 'GBP (\u00A3)', symbol: '\u00A3' },
  { code: 'AED', label: 'AED (AED)', symbol: 'AED' },
  { code: 'SAR', label: 'SAR (SAR)', symbol: 'SAR' },
  { code: 'AUD', label: 'AUD (A$)', symbol: 'A$' },
  { code: 'CAD', label: 'CAD (C$)', symbol: 'C$' },
  { code: 'SGD', label: 'SGD (S$)', symbol: 'S$' },
  { code: 'CHF', label: 'CHF (CHF)', symbol: 'CHF' },
  { code: 'JPY', label: 'JPY (\u00A5)', symbol: '\u00A5' },
];
