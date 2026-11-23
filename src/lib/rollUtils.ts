import { checkObjectMatchesPhone, normalizePhone } from "./phoneUtils";

/**
 * Strips all symbols, whitespace, slashes, hyphens, dots, underscores, etc.
 * and lowercases the string so roll numbers typed in ANY casing or with ANY symbols
 * (e.g. "2026/SEM/B1/1901", "2026-sem-b1-1901", "2026 SEMB1 1901", "2026.SEM.B1.1901")
 * normalize to the exact same canonical alphanumeric core ("2026semb11901").
 */
export function normalizeRollCore(rawRoll: any): string {
  if (rawRoll === undefined || rawRoll === null) return "";
  return String(rawRoll)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/gi, "");
}

/**
 * Extracts trailing numeric sequence from a roll number (e.g. "2026/SEM/B1/1901" -> "1901").
 */
export function extractRollTrailingDigits(rawRoll: any): string {
  if (!rawRoll) return "";
  const match = String(rawRoll).trim().match(/(\d+)\s*$/);
  return match ? match[1] : "";
}

/**
 * Checks whether two roll numbers represent the same student roll number,
 * ignoring case, spaces, slashes, hyphens, or any punctuation symbols.
 */
export function areRollNumbersMatching(rollA: any, rollB: any): boolean {
  const coreA = normalizeRollCore(rollA);
  const coreB = normalizeRollCore(rollB);
  if (!coreA || !coreB) return false;
  return coreA === coreB;
}

export interface StudentRollPhoneMatchResult {
  student: any | null;
  officialRollNo: string;
  matched: boolean;
  matchMethod: "roll+phone" | "roll-fuzzy+phone" | "roll" | "phone" | "unmatched";
  phoneVerified: boolean;
}

/**
 * Finds the exact student in the academy database using flexible Roll Number matching
 * (ignores uppercase/lowercase, slashes, hyphens, spaces, dots, or extra symbols)
 * combined with Phone Number verification (+94, 077, 77, etc.).
 */
export function findStudentByRollAndPhone(
  students: any[],
  rawRoll: string,
  rawPhone?: string,
  rawName?: string
): StudentRollPhoneMatchResult {
  const list = Array.isArray(students) ? students.filter(Boolean) : [];
  const inputCore = normalizeRollCore(rawRoll);
  const inputDigits = extractRollTrailingDigits(rawRoll);
  const inputNormPhone = normalizePhone(rawPhone);
  const inputNameLower = (rawName || "").trim().toLowerCase();

  const getStudentRollCandidates = (s: any): string[] => {
    return [s.rollNo, s.username, s.studentCode, s.student_id, s.id]
      .filter((v) => v !== undefined && v !== null && String(v).trim() !== "")
      .map((v) => String(v).trim());
  };

  const getOfficialRoll = (s: any): string => {
    return String(s.rollNo || s.studentCode || s.username || s.id || "").trim();
  };

  // 1. Exact alphanumeric core match on Roll Number (ignores all capitals & symbols)
  if (inputCore) {
    const exactRollMatches = list.filter((s) =>
      getStudentRollCandidates(s).some((cand) => normalizeRollCore(cand) === inputCore)
    );

    if (exactRollMatches.length > 0) {
      // Prefer the match whose phone also matches!
      if (rawPhone && inputNormPhone.length >= 6) {
        const verified = exactRollMatches.find((s) => checkObjectMatchesPhone(s, rawPhone));
        if (verified) {
          return {
            student: verified,
            officialRollNo: getOfficialRoll(verified),
            matched: true,
            matchMethod: "roll+phone",
            phoneVerified: true
          };
        }
      }
      // Single or name-matching roll number hit
      const best =
        exactRollMatches.length === 1
          ? exactRollMatches[0]
          : exactRollMatches.find((s) =>
              inputNameLower && String(s.name || "").toLowerCase().includes(inputNameLower)
            ) || exactRollMatches[0];

      return {
        student: best,
        officialRollNo: getOfficialRoll(best),
        matched: true,
        matchMethod: "roll",
        phoneVerified: rawPhone ? checkObjectMatchesPhone(best, rawPhone) : false
      };
    }
  }

  // 2. Partial / fuzzy Roll Number + Phone Verification
  // Handles cases where student typed only suffix (e.g. "B1-1901" or "1901") or omitted/added prefix symbols
  if (rawPhone && inputNormPhone.length >= 6) {
    const phoneMatches = list.filter((s) => checkObjectMatchesPhone(s, rawPhone));

    if (phoneMatches.length > 0) {
      if (inputCore) {
        const fuzzyRollWithPhone = phoneMatches.find((s) =>
          getStudentRollCandidates(s).some((cand) => {
            const cCore = normalizeRollCore(cand);
            const cDigits = extractRollTrailingDigits(cand);
            return (
              (cCore && (cCore.includes(inputCore) || inputCore.includes(cCore))) ||
              (inputDigits.length >= 3 && cDigits && cDigits === inputDigits)
            );
          })
        );
        if (fuzzyRollWithPhone) {
          return {
            student: fuzzyRollWithPhone,
            officialRollNo: getOfficialRoll(fuzzyRollWithPhone),
            matched: true,
            matchMethod: "roll-fuzzy+phone",
            phoneVerified: true
          };
        }
      }

      // If phone matches uniquely, or matches student name, bind to their official roll number
      if (phoneMatches.length === 1) {
        return {
          student: phoneMatches[0],
          officialRollNo: getOfficialRoll(phoneMatches[0]),
          matched: true,
          matchMethod: "phone",
          phoneVerified: true
        };
      }

      if (inputNameLower.length >= 3) {
        const byNameAndPhone = phoneMatches.find((s) => {
          const sName = String(s.name || "").trim().toLowerCase();
          return sName === inputNameLower || sName.includes(inputNameLower) || inputNameLower.includes(sName);
        });
        if (byNameAndPhone) {
          return {
            student: byNameAndPhone,
            officialRollNo: getOfficialRoll(byNameAndPhone),
            matched: true,
            matchMethod: "phone",
            phoneVerified: true
          };
        }
      }
    }
  }

  // 3. Unique trailing roll digits fallback (if >= 4 digits & unique in DB)
  if (inputCore.length >= 4) {
    const partialMatches = list.filter((s) =>
      getStudentRollCandidates(s).some((cand) => {
        const cCore = normalizeRollCore(cand);
        return cCore.endsWith(inputCore) || (inputDigits.length >= 4 && extractRollTrailingDigits(cand) === inputDigits);
      })
    );
    if (partialMatches.length === 1) {
      return {
        student: partialMatches[0],
        officialRollNo: getOfficialRoll(partialMatches[0]),
        matched: true,
        matchMethod: "roll",
        phoneVerified: rawPhone ? checkObjectMatchesPhone(partialMatches[0], rawPhone) : false
      };
    }
  }

  return {
    student: null,
    officialRollNo: (rawRoll || "").trim().toUpperCase(),
    matched: false,
    matchMethod: "unmatched",
    phoneVerified: false
  };
}
