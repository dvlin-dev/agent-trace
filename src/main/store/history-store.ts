import type Database from "better-sqlite3";
import type { RequestRecord, SessionSummary } from "../../shared/types";
import { MAX_REQUESTS } from "../../shared/defaults";
import { extractUserText } from "../../shared/extract-user-text";

export class HistoryStore {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  saveRequest(record: RequestRecord): void {
    const insertRequest = this.db.prepare(`
      INSERT OR REPLACE INTO requests
        (request_id, session_id, method, path, timestamp, duration, model,
         request_headers, request_body, response_headers, response_body,
         status_code, request_size, response_size)
      VALUES
        (@requestId, @sessionId, @method, @path, @timestamp, @duration, @model,
         @requestHeaders, @requestBody, @responseHeaders, @responseBody,
         @statusCode, @requestSize, @responseSize)
    `);

    const upsertSession = this.db.prepare(`
      INSERT INTO sessions (session_id, title, started_at, updated_at, request_count, model)
      VALUES (@sessionId, @title, @timestamp, @timestamp, 1, @model)
      ON CONFLICT(session_id) DO UPDATE SET
        updated_at = @timestamp,
        request_count = request_count + 1,
        model = COALESCE(@model, model)
    `);

    const title = this.deriveTitle(record);

    const tx = this.db.transaction(() => {
      insertRequest.run({
        requestId: record.requestId,
        sessionId: record.sessionId,
        method: record.method,
        path: record.path,
        timestamp: record.timestamp,
        duration: record.duration,
        model: record.model,
        requestHeaders: JSON.stringify(record.requestHeaders),
        requestBody: record.requestBody,
        responseHeaders: record.responseHeaders
          ? JSON.stringify(record.responseHeaders)
          : null,
        responseBody: record.responseBody,
        statusCode: record.statusCode,
        requestSize: record.requestSize,
        responseSize: record.responseSize,
      });

      upsertSession.run({
        sessionId: record.sessionId,
        title,
        timestamp: record.timestamp,
        model: record.model,
      });
    });

    tx();
  }

  listSessions(): SessionSummary[] {
    const rows = this.db
      .prepare(
        `SELECT session_id, title, started_at, updated_at, request_count, model
         FROM sessions ORDER BY updated_at DESC`,
      )
      .all() as Array<{
      session_id: string;
      title: string;
      started_at: string;
      updated_at: string;
      request_count: number;
      model: string | null;
    }>;

    return rows.map((r) => ({
      sessionId: r.session_id,
      title: r.title,
      startedAt: r.started_at,
      updatedAt: r.updated_at,
      requestCount: r.request_count,
      model: r.model,
    }));
  }

  listRequests(sessionId: string): RequestRecord[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM requests WHERE session_id = ? ORDER BY timestamp ASC`,
      )
      .all(sessionId) as Array<Record<string, unknown>>;

    return rows.map((r) => this.mapRow(r));
  }

  getRequest(requestId: string): RequestRecord | null {
    const row = this.db
      .prepare(`SELECT * FROM requests WHERE request_id = ?`)
      .get(requestId) as Record<string, unknown> | undefined;

    return row ? this.mapRow(row) : null;
  }

  search(query: string): {
    sessions: SessionSummary[];
    requests: RequestRecord[];
  } {
    const like = `%${query}%`;

    const sessions = this.db
      .prepare(
        `SELECT session_id, title, started_at, updated_at, request_count, model
         FROM sessions WHERE title LIKE ? ORDER BY updated_at DESC LIMIT 20`,
      )
      .all(like) as Array<{
      session_id: string;
      title: string;
      started_at: string;
      updated_at: string;
      request_count: number;
      model: string | null;
    }>;

    const requests = this.db
      .prepare(
        `SELECT * FROM requests
         WHERE path LIKE ? OR request_body LIKE ? OR response_body LIKE ?
         ORDER BY timestamp DESC LIMIT 20`,
      )
      .all(like, like, like) as Array<Record<string, unknown>>;

    return {
      sessions: sessions.map((r) => ({
        sessionId: r.session_id,
        title: r.title,
        startedAt: r.started_at,
        updatedAt: r.updated_at,
        requestCount: r.request_count,
        model: r.model,
      })),
      requests: requests.map((r) => this.mapRow(r)),
    };
  }

  clearAll(): void {
    this.db.exec("DELETE FROM requests; DELETE FROM sessions;");
  }

  prune(): void {
    const countRow = this.db
      .prepare("SELECT COUNT(*) as cnt FROM requests")
      .get() as { cnt: number };

    if (countRow.cnt > MAX_REQUESTS) {
      const excess = countRow.cnt - MAX_REQUESTS;
      this.db
        .prepare(
          `DELETE FROM requests WHERE request_id IN (
            SELECT request_id FROM requests ORDER BY timestamp ASC LIMIT ?
          )`,
        )
        .run(excess);

      // Clean up orphaned sessions
      this.db.exec(`
        DELETE FROM sessions WHERE session_id NOT IN (
          SELECT DISTINCT session_id FROM requests
        )
      `);
    }
  }

  private deriveTitle(record: RequestRecord): string {
    try {
      if (record.requestBody) {
        const body = JSON.parse(record.requestBody);
        if (Array.isArray(body.messages)) {
          // Look through all user messages for real user text
          for (const msg of body.messages) {
            if (msg.role !== "user") continue;
            const text = extractUserText(msg.content);
            if (text.length > 0) {
              return text.slice(0, 50);
            }
          }
        }
      }
    } catch {
      // ignore parse errors
    }
    const model = record.model ?? "unknown";
    return `${model} @ ${record.timestamp}`;
  }

  private mapRow(r: Record<string, unknown>): RequestRecord {
    return {
      requestId: r.request_id as string,
      sessionId: r.session_id as string,
      method: r.method as string,
      path: r.path as string,
      timestamp: r.timestamp as string,
      duration: r.duration as number | null,
      model: r.model as string | null,
      requestHeaders: JSON.parse(r.request_headers as string),
      requestBody: r.request_body as string | null,
      responseHeaders: r.response_headers
        ? JSON.parse(r.response_headers as string)
        : null,
      responseBody: r.response_body as string | null,
      statusCode: r.status_code as number | null,
      requestSize: r.request_size as number,
      responseSize: r.response_size as number | null,
    };
  }
}
