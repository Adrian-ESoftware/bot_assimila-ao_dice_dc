const crypto = require('crypto');
const config = require('../config');

class RollStore {
  constructor(ttlMs = config.rollTtlMs) {
    this.ttlMs = ttlMs;
    this.sessions = new Map();
  }

  create(data) {
    this.prune();
    const id = crypto.randomBytes(4).toString('hex');
    const record = {
      id,
      ...data,
      createdAt: Date.now(),
    };
    this.sessions.set(id, record);
    return record;
  }

  get(id) {
    const record = this.sessions.get(id);
    if (!record) return null;
    if (Date.now() - record.createdAt > this.ttlMs) {
      this.sessions.delete(id);
      return null;
    }
    return record;
  }

  update(id, patch) {
    const record = this.get(id);
    if (!record) return null;
    Object.assign(record, patch, { createdAt: Date.now() });
    return record;
  }

  prune() {
    const now = Date.now();
    for (const [id, rec] of this.sessions.entries()) {
      if (now - rec.createdAt > this.ttlMs) {
        this.sessions.delete(id);
      }
    }
  }
}

module.exports = {
  RollStore,
};
