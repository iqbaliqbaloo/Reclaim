CREATE TABLE IF NOT EXISTS users (
  id                bigserial     PRIMARY KEY,
  auth_id           varchar(255)  UNIQUE NOT NULL,
  email             varchar(255)  UNIQUE NOT NULL,
  name              varchar(100)  DEFAULT NULL,
  phone             varchar(20)   DEFAULT NULL,
  avatar_url        text          DEFAULT NULL,
  role              varchar(20)   NOT NULL DEFAULT 'visitor',
  reputation        integer       NOT NULL DEFAULT 0,
  daily_post_count  integer       NOT NULL DEFAULT 0,
  last_post_date    date          DEFAULT NULL,
  is_banned         boolean       NOT NULL DEFAULT false,
  ban_reason        text          DEFAULT NULL,
  created_at        timestamptz   NOT NULL DEFAULT NOW(),
  updated_at        timestamptz   NOT NULL DEFAULT NOW()
);