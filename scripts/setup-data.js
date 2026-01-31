const fs = require('fs');
const path = require('path');
const duckdb = require('duckdb');

const DATA_DIR = path.join(__dirname, '../data');
const SOURCE_CSV = path.join(DATA_DIR, 'source.csv');
const OUTPUT_PARQUET = path.join(DATA_DIR, 'crime.parquet');

// Chicago approximate bounds
const CENTER_LAT = 41.8781;
const CENTER_LON = -87.6298;
const LAT_RANGE = 0.1;
const LON_RANGE = 0.1;

// Time range: Last year
const END_TIME = new Date().getTime();
const START_TIME = END_TIME - 365 * 24 * 60 * 60 * 1000;

const NUM_POINTS = 100000;
const TYPES = ['Theft', 'Assault', 'Burglary', 'Robbery', 'Vandalism'];

function generateCSV() {
  console.log('Generating synthetic data...');
  return new Promise((resolve, reject) => {
    const stream = fs.createWriteStream(SOURCE_CSV);
    stream.write('id,type,lat,lon,timestamp\n');

    for (let i = 0; i < NUM_POINTS; i++) {
      const id = `evt_${i}`;
      const type = TYPES[Math.floor(Math.random() * TYPES.length)];
      const lat = CENTER_LAT + (Math.random() - 0.5) * LAT_RANGE;
      const lon = CENTER_LON + (Math.random() - 0.5) * LON_RANGE;
      const timestamp = new Date(START_TIME + Math.random() * (END_TIME - START_TIME)).toISOString();
      stream.write(`${id},${type},${lat},${lon},${timestamp}\n`);
    }

    stream.end();
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
}

function runQuery(conn, query) {
  return new Promise((resolve, reject) => {
    conn.all(query, (err, res) => {
      if (err) reject(err);
      else resolve(res);
    });
  });
}

async function main() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR);
  }

  if (!fs.existsSync(SOURCE_CSV)) {
    await generateCSV();
    console.log(`Generated ${SOURCE_CSV}`);
  } else {
    console.log('Using existing source.csv');
  }

  console.log('Converting to Parquet with DuckDB...');
  const db = new duckdb.Database(':memory:');
  const conn = db.connect();

  try {
    // Load CSV
    await runQuery(conn, `CREATE TABLE raw_data AS SELECT * FROM read_csv_auto('${SOURCE_CSV}')`);
    
    // Get time range for normalization
    const timeRes = await runQuery(conn, 'SELECT MIN(timestamp) as min_t, MAX(timestamp) as max_t FROM raw_data');
    const minT = new Date(timeRes[0].min_t).getTime();
    const maxT = new Date(timeRes[0].max_t).getTime();
    const rangeT = maxT - minT || 1;

    console.log(`Time range: ${new Date(minT).toISOString()} to ${new Date(maxT).toISOString()}`);

    // Create Parquet with projected columns
    // X: (lon + 180) / 360  (0 to 1)
    // Z: Web Mercator Y (0 to 1)
    // Y: Time (0 to 100)
    const query = `
      COPY (
        SELECT 
          id,
          type,
          lat,
          lon,
          timestamp,
          (lon + 180.0) / 360.0 AS x,
          (1.0 - (ln(tan(lat * PI() / 180.0) + (1.0 / cos(lat * PI() / 180.0))) / PI())) / 2.0 AS z,
          ((epoch(timestamp) * 1000 - ${minT}) / ${rangeT}) * 100.0 AS y
        FROM raw_data
      ) TO '${OUTPUT_PARQUET}' (FORMAT 'parquet')
    `;

    await runQuery(conn, query);
    console.log(`Created ${OUTPUT_PARQUET}`);

  } catch (err) {
    console.error('Error during DuckDB processing:', err);
    process.exit(1);
  }
}

main();
