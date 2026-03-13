import Database from "better-sqlite3";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS requests (
  request_id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  method TEXT NOT NULL,
  path TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  duration INTEGER,
  model TEXT,
  request_headers TEXT NOT NULL,
  request_body TEXT,
  response_headers TEXT,
  response_body TEXT,
  status_code INTEGER,
  request_size INTEGER NOT NULL DEFAULT 0,
  response_size INTEGER
);

CREATE TABLE IF NOT EXISTS sessions (
  session_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  started_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0,
  model TEXT
);

CREATE INDEX IF NOT EXISTS idx_requests_session ON requests(session_id);
CREATE INDEX IF NOT EXISTS idx_requests_timestamp ON requests(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_updated ON sessions(updated_at DESC);
`;

export function createDatabase(dbPath: string): Database.Database {
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.exec(SCHEMA);
  return db;
}
