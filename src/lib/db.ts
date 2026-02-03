let db: unknown = null;

export const getDb = async (): Promise<any> => {
  if (!db) {
    const duckdb = await import('duckdb');
    db = new duckdb.default.Database(':memory:');
  }
  return db;
};
