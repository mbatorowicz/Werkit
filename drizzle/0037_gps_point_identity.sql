ALTER TABLE gps_logs ADD COLUMN IF NOT EXISTS client_point_id varchar(100);
CREATE UNIQUE INDEX IF NOT EXISTS gps_logs_client_point_id_unique ON gps_logs(client_point_id);
