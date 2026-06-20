CREATE TABLE IF NOT EXISTS notifications (
  id          bigserial    PRIMARY KEY,
  user_id     varchar(255) NOT NULL,
  type        varchar(50)  NOT NULL,
  title       text         NOT NULL,
  body        text         NOT NULL,
  data        jsonb        DEFAULT '{}',
  is_read     boolean      NOT NULL DEFAULT false,
  created_at  timestamptz  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user   ON notifications (user_id);
CREATE INDEX idx_notifications_read   ON notifications (user_id, is_read);
CREATE INDEX idx_notifications_type   ON notifications (type);

CREATE TABLE IF NOT EXISTS email_queue (
  id          bigserial    PRIMARY KEY,
  to_email    varchar(255) NOT NULL,
  subject     text         NOT NULL,
  html        text         NOT NULL,
  sent        boolean      NOT NULL DEFAULT false,
  attempts    integer      NOT NULL DEFAULT 0,
  created_at  timestamptz  NOT NULL DEFAULT NOW(),
  sent_at     timestamptz  DEFAULT NULL
);

CREATE INDEX idx_email_queue_sent ON email_queue (sent);