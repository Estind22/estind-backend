// utils/normalizePhone.js

/**
 * Normalizes a phone number to E.164 format WITHOUT the leading '+'
 * so it matches WhatsApp's waId format (e.g. "919876543210").
 *
 * Handles all formats CRM numbers can arrive in:
 *   - "9876543210"      (10-digit, no country code)  → "919876543210"
 *   - "09876543210"     (10-digit with leading 0)    → "919876543210"
 *   - "+919876543210"   (E.164 with +)               → "919876543210"
 *   - "919876543210"    (already normalized 12-digit) → "919876543210"
 *
 * Returns null if the result isn't 12 digits (i.e. not a valid Indian mobile).
 */
export const normalizeWhatsAppNumber = (phone) => {
    if (!phone) return null;

    // Strip everything except digits
    let clean = String(phone).replace(/\D/g, "");

    // Handle leading-zero (e.g. "09876543210" → 11 digits, strip the leading 0)
    if (clean.length === 11 && clean.startsWith("0")) {
        clean = clean.slice(1);
    }

    // Bare 10-digit number → prepend India country code
    if (clean.length === 10) {
        clean = "91" + clean;
    }

    // Valid Indian WhatsApp number is exactly 12 digits starting with 91
    if (clean.length !== 12 || !clean.startsWith("91")) {
        return null;
    }

    return clean;
};

/**
 * Returns the last 10 digits of a phone number if it looks like an Indian number.
 * Useful for storing leads in the format: "9876543210"
 */
export const to10Digit = (phone) => {
    if (!phone) return null;
    let clean = String(phone).replace(/\D/g, "");
    
    // If it's 11 digits starting with 0, strip the 0
    if (clean.length === 11 && clean.startsWith("0")) {
        clean = clean.slice(1);
    }
    
    // If it's 12 digits starting with 91, strip the 91
    if (clean.length === 12 && clean.startsWith("91")) {
        clean = clean.slice(2);
    }
    
    // If it's exactly 10 digits, we are good
    if (clean.length === 10) {
        return clean;
    }
    
    // Fallback to last 10 digits if it's longer (e.g. +91...)
    if (clean.length > 10) {
        return clean.slice(-10);
    }
    
    return clean;
};

/**
 * Returns the last 10 digits of a phone number for regex matching.
 */
export const getLast10Digits = (phone) => {
    if (!phone) return null;
    const digits = String(phone).replace(/\D/g, "");
    return digits.length >= 10 ? digits.slice(-10) : null;
};
