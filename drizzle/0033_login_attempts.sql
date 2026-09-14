-- S1: rate limit logowania współdzielony między instancjami (Postgres, nie RAM).
-- key = pierwszy hop X-Forwarded-For + ':' + znormalizowany login.

CREATE TABLE IF NOT EXISTS login_attempts (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  reset_at TIMESTAMP NOT NULL
);
