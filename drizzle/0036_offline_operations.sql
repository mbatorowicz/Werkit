CREATE TABLE IF NOT EXISTS offline_operations (
 id varchar(100) PRIMARY KEY,
 company_id integer NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
 user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 request_hash text NOT NULL,
 created_at timestamp NOT NULL DEFAULT now()
);
