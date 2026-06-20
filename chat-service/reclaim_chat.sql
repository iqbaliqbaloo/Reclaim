CREATE TABLE IF NOT EXISTS conversations (
  id               bigserial    PRIMARY KEY,
  listing_id       bigint       NOT NULL,
  lost_user_id     varchar(255) NOT NULL,
  found_user_id    varchar(255) NOT NULL,
  claim_id         bigint       NOT NULL,
  lost_msg_count   integer      NOT NULL DEFAULT 0,
  found_msg_count  integer      NOT NULL DEFAULT 0,
  lost_confirmed   boolean      DEFAULT NULL,
  found_confirmed  boolean      DEFAULT NULL,
  resolution_status varchar(20) NOT NULL DEFAULT 'pending'
                   CHECK (resolution_status IN (
                     'pending','both_confirmed','disputed',
                     'admin_resolved','unresolved'
                   )),
  status           varchar(20)  NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active','closed')),
  created_at       timestamptz  NOT NULL DEFAULT NOW(),
  updated_at       timestamptz  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id              bigserial    PRIMARY KEY,
  conversation_id bigint       NOT NULL REFERENCES conversations(id),
  sender_id       varchar(255) NOT NULL,
  body            text         NOT NULL,
  read_at         timestamptz  DEFAULT NULL,
  created_at      timestamptz  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_conversations_lost_user  ON conversations (lost_user_id);
CREATE INDEX idx_conversations_found_user ON conversations (found_user_id);
CREATE INDEX idx_conversations_listing    ON conversations (listing_id);
CREATE INDEX idx_messages_conversation    ON messages (conversation_id);
CREATE INDEX idx_messages_sender          ON messages (sender_id);