/**
 * Derive enrollment year from NIM by reading the first two digits.
 * Example: NIM 2211522018 -> 2022.
 *
 * Uses a pivot to decide century:
 *  - If YY >= pivot -> 1900 + YY
 *  - Else -> 2000 + YY
 * Default pivot is 50 (so 50..99 -> 1950..1999, 00..49 -> 2000..2049).
 * For modern datasets (2015+), this yields expected results.
 *
 * @param {string|number} nim - Student identity number
 * @param {number} [pivot=50] - Century pivot for year inference
 * @returns {number|null} Enrollment year or null if cannot be inferred
 */
export function deriveEnrollmentYearFromNIM(nim, pivot = 50) {
	if (nim == null) return null;
	const s = String(nim).trim();
	const digits = s.replace(/\D+/g, "");
	if (digits.length < 2) return null;
	const yy = parseInt(digits.slice(0, 2), 10);
	if (Number.isNaN(yy)) return null;
	if (yy >= pivot) return 1900 + yy;
	return 2000 + yy;
}
