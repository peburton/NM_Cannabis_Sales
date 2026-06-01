import { useState, useEffect, useRef } from "react";
import * as duckdb from "@duckdb/duckdb-wasm";

let dbInstance = null;
let initPromise = null;

async function initDuckDB() {
  if (dbInstance) return dbInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();
    const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);
    const worker_url = URL.createObjectURL(
      new Blob([`importScripts("${bundle.mainWorker}");`], {
        type: "text/javascript",
      })
    );
    const worker = new Worker(worker_url);
    const logger = new duckdb.ConsoleLogger();
    const db = new duckdb.AsyncDuckDB(logger, worker);
    await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
    URL.revokeObjectURL(worker_url);
    dbInstance = db;
    return db;
  })();

  return initPromise;
}

export function useDuckDB() {
  const [db, setDb] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const connRef = useRef(null);

  useEffect(() => {
    initDuckDB()
      .then(async (database) => {
        const conn = await database.connect();
        connRef.current = conn;
        setDb({ database, conn });
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  async function query(sql) {
    if (!connRef.current) throw new Error("DuckDB not initialized");
    const result = await connRef.current.query(sql);
    return result.toArray().map((row) => row.toJSON());
  }

  return { db, loading, error, query };
}