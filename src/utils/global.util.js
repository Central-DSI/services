/**
 * Convert a name string to Title Case format.
 * Example: "NABIL RIZKI NAVISA" -> "Nabil Rizki Navisa"
 * Example: "husnii kamil" -> "Husnii Kamil"
 *
 * @param {string} input - Name string to convert
 * @returns {string} Name in Title Case format
 */
export function toTitleCaseName(input) {
	if (!input) return "-";
	const s = String(input).trim().toLowerCase();
	if (!s) return "-";
	return s
		.split(/\s+/)
		.map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
		.join(" ");
}

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
