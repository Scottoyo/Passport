// Groups the 12-digit passport_number (supabase/migrations/0038) into
// space-separated 4-digit chunks for readability, e.g. "5288 2306 7602".
export function formatPassportNumber(passportNumber: string): string {
  return passportNumber.match(/.{1,4}/g)?.join(" ") ?? passportNumber;
}
