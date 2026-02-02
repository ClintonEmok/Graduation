
export const CRIME_TYPE_MAP: Record<string, number> = {
  'THEFT': 1,
  'BATTERY': 2,
  'CRIMINAL DAMAGE': 3,
  'NARCOTICS': 4,
  'ASSAULT': 5,
  'OTHER OFFENSE': 6,
  'BURGLARY': 7,
  'MOTOR VEHICLE THEFT': 8,
  'DECEPTIVE PRACTICE': 9,
  'ROBBERY': 10,
  'CRIMINAL TRESPASS': 11,
  'WEAPONS VIOLATION': 12,
  'PROSTITUTION': 13,
  'PUBLIC PEACE VIOLATION': 14,
  'OFFENSE INVOLVING CHILDREN': 15,
  'CRIM SEXUAL ASSAULT': 16,
  'SEX OFFENSE': 17,
  'INTERFERENCE WITH PUBLIC OFFICER': 18,
  'GAMBLING': 19,
  'LIQUOR LAW VIOLATION': 20,
  'ARSON': 21,
  'HOMICIDE': 22,
  'KIDNAPPING': 23,
  'INTIMIDATION': 24,
  'STALKING': 25,
  'OBSCENITY': 26,
  'CONCEALED CARRY LICENSE VIOLATION': 27,
  'NON-CRIMINAL': 28,
  'PUBLIC INDECENCY': 29,
  'HUMAN TRAFFICKING': 30,
  'OTHER NARCOTIC VIOLATION': 31,
  'NON-CRIMINAL (SUBJECT SPECIFIED)': 32,
  'RITUALISM': 33,
  // Legacy/Simple Mappings
  'Theft': 1,
  'Assault': 5,
  'Burglary': 7,
  'Robbery': 10,
  'Vandalism': 3,
  'Other': 6
};

// Generate District Map 1-31
// Chicago districts are numbered 1-25, 31.
export const DISTRICT_MAP: Record<string, number> = {};
for(let i=1; i<=35; i++) {
    DISTRICT_MAP[String(i)] = i;
    DISTRICT_MAP[String(i).padStart(3, '0')] = i; // Handle "001"
}

export const getCrimeTypeId = (type: string): number => {
    if (!type) return 0;
    const normalized = type.toUpperCase();
    return CRIME_TYPE_MAP[normalized] || CRIME_TYPE_MAP[type] || 0;
};

export const getDistrictId = (district: string): number => {
    if (!district) return 0;
    // Handle "District 1" or "001"
    const cleaned = district.replace(/[^0-9]/g, '');
    const id = parseInt(cleaned, 10);
    if (!isNaN(id) && id > 0 && id < 255) return id;
    return 0;
};

export const CRIME_ID_TO_TYPE = Object.entries(CRIME_TYPE_MAP).reduce((acc, [k, v]) => {
    // Prefer uppercase keys if duplicates exist
    if (!acc[v] || k === k.toUpperCase()) {
        acc[v] = k;
    }
    return acc;
}, {} as Record<number, string>);

// Reverse mapping for districts
export const DISTRICT_ID_TO_NAME = Object.entries(DISTRICT_MAP).reduce((acc, [k, v]) => {
  if (!acc[v] || k.length === 3) { // Prefer 3-digit codes
    acc[v] = k.padStart(3, '0');
  }
  return acc;
}, {} as Record<number, string>);

/**
 * Get all unique crime type IDs (excluding 0/unknown)
 * @returns Array of all valid crime type IDs
 */
export function getAllCrimeTypeIds(): number[] {
  return [...new Set(Object.values(CRIME_TYPE_MAP).filter(id => id !== 0))];
}

/**
 * Get all active district IDs (1-25, excluding merged/closed districts)
 * @returns Array of all valid district IDs
 */
export function getAllDistrictIds(): number[] {
  return Array.from({ length: 25 }, (_, i) => i + 1);
}

/**
 * Check if a crime type ID is valid
 * @param id - The crime type ID to check
 * @returns True if valid
 */
export function isValidCrimeTypeId(id: number): boolean {
  return id > 0 && id <= 35 && !!CRIME_ID_TO_TYPE[id];
}

/**
 * Check if a district ID is valid
 * @param id - The district ID to check
 * @returns True if valid
 */
export function isValidDistrictId(id: number): boolean {
  return id >= 1 && id <= 35;
}

/**
 * Get crime type name by ID
 * @param id - The crime type ID
 * @returns The crime type name or 'Unknown'
 */
export function getCrimeTypeName(id: number): string {
  return CRIME_ID_TO_TYPE[id] || 'Unknown';
}

/**
 * Get district name by ID
 * @param id - The district ID
 * @returns The district code (e.g., '001') or 'Unknown'
 */
export function getDistrictName(id: number): string {
  return DISTRICT_ID_TO_NAME[id] || 'Unknown';
}
