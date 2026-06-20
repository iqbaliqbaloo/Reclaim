CREATE TABLE IF NOT EXISTS matches (
  id               bigserial    PRIMARY KEY,
  lost_listing_id  bigint       NOT NULL,
  found_listing_id bigint       NOT NULL,
  score            decimal(5,4) NOT NULL,
  notified_lost    boolean      NOT NULL DEFAULT false,
  notified_found   boolean      NOT NULL DEFAULT false,
  status           varchar(20)  NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','accepted','dismissed')),
  created_at       timestamptz  NOT NULL DEFAULT NOW(),
  updated_at       timestamptz  NOT NULL DEFAULT NOW(),
  UNIQUE (lost_listing_id, found_listing_id)
);

CREATE INDEX idx_matches_lost_listing  ON matches (lost_listing_id);
CREATE INDEX idx_matches_found_listing ON matches (found_listing_id);
CREATE INDEX idx_matches_score         ON matches (score DESC);
CREATE INDEX idx_matches_status        ON matches (status);