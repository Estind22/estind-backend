/**
 * Escapes special characters in a string for use in a regular expression.
 * @param {string} text - The text to escape.
 * @returns {string} The escaped text.
 */
export function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Generates a flexible regex for search based on the provided query.
 * It splits the query into words and then into 2-character tokens.
 * Matches all tokens in any order using positive lookaheads.
 * 
 * Example: "abhay Gupta" -> /(?=.*ab)(?=.*ha)(?=.*y)(?=.*Gu)(?=.*pt)(?=.*a)/i
 * 
 * @param {string} query - The search query provided by the user.
 * @returns {RegExp | null} The generated RegExp or null if query is empty.
 */
export const getFlexibleSearchRegex = (query) => {
  if (!query || typeof query !== "string" || !query.trim()) {
    return null;
  }

  const words = query.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return null;

  // Build lookaheads for each word to ensure all words are present in any order
  const lookaheads = words
    .map((word) => {
      const escaped = escapeRegex(word);

      // If the word consists primarily of digits, make it digit-flexible for phone numbers
      // Example: "999999" matches "999 999" or "999-999"
      if (/^\+?\d+$/.test(word)) {
        const digits = word.replace(/\D/g, "");
        if (digits.length >= 10) {
          // Focus on the last 10 digits to ignore country code variations (+91, 0, etc.)
          const last10 = digits.slice(-10);
          return `(?=.*${last10.split("").join("[^0-9]*")})`;
        }
        if (digits.length > 0) {
          return `(?=.*${digits.split("").join("[^0-9]*")})`;
        }
      }

      return `(?=.*${escaped})`;
    })
    .join("");

  return new RegExp(lookaheads, "i");
};

/**
 * Generates a flexible regex for a phone number search by stripping non-digits
 * and joining remaining digits with non-digit wildcards `[^0-9]*`.
 * Focuses on trailing 10 digits if query is >= 10 digits to handle country code variations.
 * 
 * @param {string} phone - The raw phone number input.
 * @returns {RegExp | null} The RegExp object matching the normalized digits flexibly, or null.
 */
export const getFlexiblePhoneRegex = (phone) => {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, "");
  if (!digits) return null;

  const matchDigits = digits.length >= 10 ? digits.slice(-10) : digits;
  const flexiblePattern = matchDigits.split("").join("[^0-9]*");
  return new RegExp(flexiblePattern, "i");
};
