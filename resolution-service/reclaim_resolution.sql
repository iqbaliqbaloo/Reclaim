CREATE TABLE IF NOT EXISTS resolutions (
  id               bigserial    PRIMARY KEY,
  conversation_id  bigint       NOT NULL UNIQUE,
  listing_id       bigint       NOT NULL,
  lost_user_id     varchar(255) NOT NULL,
  found_user_id    varchar(255) NOT NULL,
  lost_ip          varchar(50)  DEFAULT NULL,
  found_ip         varchar(50)  DEFAULT NULL,
  reputation_given boolean      NOT NULL DEFAULT false,
  status           varchar(20)  NOT NULL DEFAULT 'resolved'
                   CHECK (status IN ('resolved','disputed','admin_resolved')),
  created_at       timestamptz  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_resolutions_listing      ON resolutions (listing_id);
CREATE INDEX idx_resolutions_lost_user    ON resolutions (lost_user_id);
CREATE INDEX idx_resolutions_found_user   ON resolutions (found_user_id);