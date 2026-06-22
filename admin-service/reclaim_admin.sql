CREATE TABLE IF NOT EXISTS reports (
  id           bigserial    PRIMARY KEY,
  reporter_id  varchar(255) NOT NULL,
  target_type  varchar(20)  NOT NULL CHECK (target_type IN ('listing','user','chat')),
  target_id    varchar(255) NOT NULL,
  reason       text         NOT NULL,
  status       varchar(20)  NOT NULL DEFAULT 'open'
               CHECK (status IN ('open','resolved','dismissed')),
  resolved_by  varchar(255) DEFAULT NULL,
  created_at   timestamptz  NOT NULL DEFAULT NOW(),
  updated_at   timestamptz  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reports_status      ON reports (status);
CREATE INDEX idx_reports_target      ON reports (target_type, target_id);
CREATE INDEX idx_reports_reporter    ON reports (reporter_id);