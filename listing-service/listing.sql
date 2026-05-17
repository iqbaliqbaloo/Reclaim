CREATE TABLE IF NOT EXISTS listings (
  id               bigserial     PRIMARY KEY,
  user_id          varchar(255)  NOT NULL,
  type             varchar(10)   NOT NULL CHECK (type IN ('lost', 'found')),
  title            varchar(120)  NOT NULL,
  description      text          NOT NULL,
  category         varchar(50)   NOT NULL CHECK (category IN (
                     'electronics', 'wallet', 'keys', 'pets',
                     'bags', 'documents', 'clothing', 'other'
                   )),
  date_occurred    date          NOT NULL,
  location_label   varchar(200)  NOT NULL,
  latitude         decimal(9,6)  NOT NULL,
  longitude        decimal(9,6)  NOT NULL,
  reward_offered   boolean       NOT NULL DEFAULT false,
  reward_note      text          DEFAULT NULL,
  status           varchar(20)   NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active', 'resolved', 'removed', 'expired')),
  deleted_at       timestamptz   DEFAULT NULL,
  created_at       timestamptz   NOT NULL DEFAULT NOW(),
  updated_at       timestamptz   NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS listing_images (
  id           bigserial    PRIMARY KEY,
  listing_id   bigint       NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  storage_type varchar(10)  NOT NULL DEFAULT 's3' CHECK (storage_type IN ('s3', 'db')),
  url          text         DEFAULT NULL,
  data         bytea        DEFAULT NULL,
  created_at   timestamptz  NOT NULL DEFAULT NOW()
);