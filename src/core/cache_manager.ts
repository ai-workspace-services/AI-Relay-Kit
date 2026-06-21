import crypto from 'crypto';

interface SessionState {
  id: string;
  history: any[]; // Chat messages
  lastUpdatedAt: number;
}

export class CacheManager {
  private sessions: Map<string, SessionState> = new Map();
  private maxSessions: number;
  private ttlMs: number;

  constructor(maxSessions = 256, ttlHours = 168) {
    this.maxSessions = maxSessions;
    this.ttlMs = ttlHours * 3600 * 1000;
  }

  public generateId(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  public getSession(id: string): SessionState | undefined {
    const session = this.sessions.get(id);
    if (session) {
      if (Date.now() - session.lastUpdatedAt > this.ttlMs) {
        this.sessions.delete(id);
        return undefined;
      }
      session.lastUpdatedAt = Date.now();
    }
    return session;
  }

  public saveSession(id: string, history: any[]): void {
    this.cleanup();
    this.sessions.set(id, {
      id,
      history,
      lastUpdatedAt: Date.now()
    });
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [id, session] of this.sessions.entries()) {
      if (now - session.lastUpdatedAt > this.ttlMs) {
        this.sessions.delete(id);
      }
    }
    
    if (this.sessions.size >= this.maxSessions) {
      // delete oldest
      let oldestId: string | null = null;
      let oldestTime = Infinity;
      for (const [id, session] of this.sessions.entries()) {
        if (session.lastUpdatedAt < oldestTime) {
          oldestTime = session.lastUpdatedAt;
          oldestId = id;
        }
      }
      if (oldestId) this.sessions.delete(oldestId);
    }
  }
}

export const sessionCache = new CacheManager();
