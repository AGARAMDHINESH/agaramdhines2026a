/**
 * Utility functions for robust phone number normalization and search matching.
 * Specifically handles Sri Lankan formats (+94, 0094, 077..., 77...) and general international numbers.
 */

/**
 * Normalizes a phone number by stripping non-digit characters and standard prefixes.
 * Converts:
 * - "+94 77 354 5393" -> "773545393"
 * - "0094773545393"   -> "773545393"
 * - "0778054232"       -> "778054232"
 * - "778054232"        -> "778054232"
 */
export function normalizePhone(rawPhone: any): string {
  if (!rawPhone) return "";
  const digits = String(rawPhone).replace(/\D/g, "");
  if (!digits) return "";

  // Prefix "0094"
  if (digits.startsWith("0094") && digits.length >= 13) {
    return digits.slice(4);
  }
  // Prefix "94" (e.g., 94773545393)
  if (digits.startsWith("94") && digits.length >= 11) {
    return digits.slice(2);
  }
  // Leading "0" (e.g., 0778054232)
  if (digits.startsWith("0") && digits.length >= 10) {
    return digits.slice(1);
  }
  return digits;
}

/**
 * Checks whether a target phone number matches a search query.
 * Handles formats:
 * - "+94 77 354 5393"
 * - "0778054232"
 * - "778054232"
 * - Any spaces, hyphens, brackets, dots
 * - Partial phone numbers (min 3 digits)
 */
export function matchesPhoneSearch(targetPhone: any, query: string): boolean {
  if (!targetPhone || !query) return false;

  const rawTarget = String(targetPhone).trim();
  const rawQuery = String(query).trim();
  if (!rawTarget || !rawQuery) return false;

  // 1. Literal substring match (case-insensitive)
  if (rawTarget.toLowerCase().includes(rawQuery.toLowerCase())) {
    return true;
  }

  // Extract pure digits
  const targetDigits = rawTarget.replace(/\D/g, "");
  const queryDigits = rawQuery.replace(/\D/g, "");

  // Require at least 3 digits to avoid matching on single digit searches
  if (!queryDigits || queryDigits.length < 3) {
    return false;
  }

  // 2. Direct pure digits substring match
  if (targetDigits.includes(queryDigits) || queryDigits.includes(targetDigits)) {
    return true;
  }

  // 3. Normalized core comparison (e.g. 773545393)
  const normTarget = normalizePhone(targetDigits);
  const normQuery = normalizePhone(queryDigits);

  if (normTarget && normQuery) {
    if (normTarget === normQuery) return true;
    if (normTarget.includes(normQuery) || normQuery.includes(normTarget)) return true;
  }

  // 4. Suffix match (e.g. last 7 or 8 digits match)
  if (queryDigits.length >= 6 && targetDigits.length >= 6) {
    const qSuffix = queryDigits.slice(-7);
    const tSuffix = targetDigits.slice(-7);
    if (tSuffix === qSuffix) return true;
  }

  return false;
}

/**
 * Checks if any phone-like field in an object matches the search query.
 */
export function checkObjectMatchesPhone(obj: any, query: string): boolean {
  if (!obj || !query) return false;
  const candidateFields = [
    obj.phone,
    obj.telephone,
    obj.mobile,
    obj.whatsapp,
    obj.parentPhone,
    obj.guardianPhone,
    obj.contactNumber,
    obj.senderPhone
  ];

  for (const field of candidateFields) {
    if (field && matchesPhoneSearch(field, query)) {
      return true;
    }
  }

  return false;
}
