-- +goose Up
CREATE TABLE churches (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name       text NOT NULL CHECK (name <> ''),
    slug       text NOT NULL CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    status     text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz
);

-- A slug is unique among live churches; a deleted church frees it.
CREATE UNIQUE INDEX churches_slug_key ON churches (slug) WHERE deleted_at IS NULL;

CREATE TABLE users (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email          text NOT NULL CHECK (email <> '' AND email = lower(email)),
    name           text NOT NULL DEFAULT '',
    avatar_url     text NOT NULL DEFAULT '',
    google_subject text,
    is_super_admin boolean NOT NULL DEFAULT false,
    status         text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
    last_login_at  timestamptz,
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now(),
    deleted_at     timestamptz
);

CREATE UNIQUE INDEX users_email_key ON users (email) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX users_google_subject_key ON users (google_subject) WHERE google_subject IS NOT NULL;

-- Church Admin role: a user administers the churches listed here.
CREATE TABLE church_admins (
    church_id  uuid NOT NULL REFERENCES churches (id) ON DELETE CASCADE,
    user_id    uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (church_id, user_id)
);

CREATE INDEX church_admins_user_id_idx ON church_admins (user_id);

-- +goose Down
DROP TABLE church_admins;
DROP TABLE users;
DROP TABLE churches;
