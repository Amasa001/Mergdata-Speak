/**
 * Language utilities for standardized language handling across the application
 */

/**
 * Interface for language object
 */
export interface Language {
  id: string;      // Normalized identifier (lowercase, no spaces)
  label: string;   // Display name
  code: string;    // ISO code if applicable
  native?: string; // Name in the native language (optional)
}

/**
 * List of available languages in the application
 */
export const AVAILABLE_LANGUAGES: Language[] = [
  { id: 'english', label: 'English', code: 'en', native: 'English' },
  { id: 'french', label: 'French', code: 'fr', native: 'Français' },
  { id: 'akan', label: 'Akan', code: 'ak', native: 'Akan' },
  { id: 'ewe', label: 'Ewe', code: 'ee', native: 'Èʋegbe' },
  { id: 'ga', label: 'Ga', code: 'gaa', native: 'Ga' },
  { id: 'dagbani', label: 'Dagbani', code: 'dag', native: 'Dagbani' },
  { id: 'hausa', label: 'Hausa', code: 'ha', native: 'Hausa' },
  { id: 'twi', label: 'Twi', code: 'tw', native: 'Twi' },
  { id: 'fante', label: 'Fante', code: 'fat', native: 'Fante' },
];

/**
 * Standardize language ID format for consistent storage
 * @param language - The language string to standardize
 * @returns Standardized language ID
 */
export function standardizeLanguageId(language: string): string {
  return language.toLowerCase().trim();
}

/**
 * Get language details by ID
 * @param id - The language ID to look up
 * @returns Language object or undefined if not found
 */
export function getLanguageById(id: string): Language | undefined {
  const standardId = standardizeLanguageId(id);
  return AVAILABLE_LANGUAGES.find(lang => lang.id === standardId);
}

/**
 * Get language label/display name by ID
 * @param id - The language ID to look up
 * @returns Human-readable language label or the original ID if not found
 */
export function getLanguageLabel(id: string): string {
  const language = getLanguageById(id);
  return language ? language.label : id;
}

/**
 * Get native language name by ID
 * @param id - The language ID to look up
 * @returns Native language name or regular label if native not available
 */
export function getLanguageNativeName(id: string): string {
  const language = getLanguageById(id);
  return language?.native || language?.label || id;
}

/**
 * Get all available languages as options for select inputs
 * @returns Array of option objects with value and label properties
 */
export function getLanguageOptions(): { value: string; label: string }[] {
  return AVAILABLE_LANGUAGES.map(lang => ({
    value: lang.id,
    label: lang.label
  }));
}

/**
 * Get language ISO code by ID
 * @param id - The language ID to look up
 * @returns ISO code or empty string if not found
 */
export function getLanguageCode(id: string): string {
  const language = getLanguageById(id);
  return language?.code || '';
}

/**
 * Validate if a language ID is available in the system
 * @param id - The language ID to validate
 * @returns Boolean indicating if language is valid
 */
export function isValidLanguage(id: string): boolean {
  return !!getLanguageById(id);
} 