// A passport has no dedicated "passport number" column — this derives a
// stable, human-looking one from its id so there's something to display
// without adding a redundant generated identifier to the schema.
export function formatPassportNumber(passportId: string): string {
  const hex = passportId.replace(/-/g, "").slice(0, 9).toUpperCase();
  return hex.match(/.{1,3}/g)?.join(" ") ?? hex;
}
