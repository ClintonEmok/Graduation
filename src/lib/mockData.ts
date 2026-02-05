import { CrimeEvent, CrimeType } from '@/types';

const CRIME_TYPES: CrimeType[] = ['Theft', 'Assault', 'Burglary', 'Robbery', 'Vandalism'];
const HOT_BLOCKS = ['100 N STATE ST', '200 W MADISON ST', '300 S MICHIGAN AVE', '400 E RANDOLPH ST', '500 W ADAMS ST'];

export const generateMockData = (count: number): CrimeEvent[] => {
  const events: CrimeEvent[] = [];

  // 1. Generate sequential events for hot blocks (trajectories)
  const eventsPerBlock = Math.floor(count / (HOT_BLOCKS.length * 2));
  
  HOT_BLOCKS.forEach((block, blockIdx) => {
    // Each hot block has a fixed location
    const x = (blockIdx - 2) * 20;
    const z = (blockIdx - 2) * 20;

    for (let i = 0; i < eventsPerBlock; i++) {
      const type = CRIME_TYPES[Math.floor(Math.random() * CRIME_TYPES.length)];
      // Events distributed in time (Y)
      const y = (i / eventsPerBlock) * 50 + (Math.random() * 2);
      
      const timestamp = new Date();
      timestamp.setDate(timestamp.getDate() - Math.floor(y));

      events.push({
        id: `traj_${blockIdx}_${i}`,
        type,
        x,
        y,
        z,
        timestamp,
        block
      });
    }
  });

  // 2. Generate remaining random events
  const remaining = count - events.length;
  for (let i = 0; i < remaining; i++) {
    const type = CRIME_TYPES[Math.floor(Math.random() * CRIME_TYPES.length)];
    const x = Math.random() * 100 - 50;
    const y = Math.random() * 50;
    const z = Math.random() * 100 - 50;
    const block = `RANDOM_${Math.floor(Math.random() * 1000)}`;
    
    const timestamp = new Date();
    timestamp.setDate(timestamp.getDate() - Math.floor(y));

    events.push({
      id: Math.random().toString(36).substr(2, 9),
      type,
      x,
      y,
      z,
      timestamp,
      block
    });
  }

  // Sort by time (Y) for consistency
  return events.sort((a, b) => a.y - b.y);
};
