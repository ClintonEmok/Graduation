import { CrimeEvent, CrimeType } from '@/types';

const CRIME_TYPES: CrimeType[] = ['Theft', 'Assault', 'Burglary', 'Robbery', 'Vandalism'];

export const generateMockData = (count: number): CrimeEvent[] => {
  const events: CrimeEvent[] = [];

  for (let i = 0; i < count; i++) {
    const type = CRIME_TYPES[Math.floor(Math.random() * CRIME_TYPES.length)];
    
    // Generate random positions
    // X and Z represent space (-50 to 50)
    // Y represents time (0 to 50)
    const x = Math.random() * 100 - 50;
    const y = Math.random() * 50;
    const z = Math.random() * 100 - 50;
    
    // Generate a timestamp relative to Y (just for consistency, though visualizer might rely on Y)
    // Let's assume Y=0 is "now" and Y=50 is "50 days ago" or similar, or vice versa.
    // For now, just a random date within a range.
    const timestamp = new Date();
    timestamp.setDate(timestamp.getDate() - Math.floor(y));

    events.push({
      id: Math.random().toString(36).substr(2, 9),
      type,
      x,
      y,
      z,
      timestamp,
    });
  }

  return events;
};
