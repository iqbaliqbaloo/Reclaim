CREATE TABLE IF NOT EXISTS claims (
  id                  bigserial    PRIMARY KEY,
  listing_id          bigint       NOT NULL,
  listing_user_id     varchar(255) NOT NULL,
  claimant_id         varchar(255) NOT NULL,
  claim_description   text         NOT NULL,
  status              varchar(20)  NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','approved','rejected','expired')),
  expires_at          timestamptz  NOT NULL,
  auto_expired        boolean      NOT NULL DEFAULT false,
  reminder_1_sent     boolean      NOT NULL DEFAULT false,
  reminder_2_sent     boolean      NOT NULL DEFAULT false,
  found_update_sent   boolean      NOT NULL DEFAULT false,
  created_at          timestamptz  NOT NULL DEFAULT NOW(),
  updated_at          timestamptz  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_claims_listing_id    ON claims (listing_id);
CREATE INDEX idx_claims_claimant_id   ON claims (claimant_id);
CREATE INDEX idx_claims_listing_user  ON claims (listing_user_id);
CREATE INDEX idx_claims_status        ON claims (status);
CREATE INDEX idx_claims_expires_at    ON claims (expires_at);