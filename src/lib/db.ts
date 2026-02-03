import duckdb from 'duckdb';

let db: duckdb.Database | null = null;

export const getDb = async (): Promise<duckdb.Database> => {
  if (!db) {
    db = new duckdb.Database(':memory:');
  }
  return db;
};
