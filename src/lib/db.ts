import duckdb from 'duckdb';

let db: duckdb.Database | null = null;

export const getDb = (): duckdb.Database => {
  if (!db) {
    // We use an in-memory database and will query the parquet file directly by path
    db = new duckdb.Database(':memory:');
  }
  return db;
};
