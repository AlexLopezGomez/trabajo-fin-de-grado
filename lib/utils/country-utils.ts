/**
 * Country utilities
 * Helper functions for country-related operations
 */

/**
 * Get flag emoji from country code
 * @param countryCode - ISO 3166-1 alpha-2 country code
 * @returns Flag emoji for the country
 */
export function getFlagEmoji(countryCode: string): string {
    const codePoints = countryCode
        .toUpperCase()
        .split("")
        .map((char) => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
}
