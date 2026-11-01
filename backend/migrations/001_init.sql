-- +goose Up
-- Schema reconstructed from how the frontend used Supabase (tables, columns, RPC behaviour).
-- Soft delete = is_deleted + deleted_at, moved together. Uniqueness indexes ignore deleted rows.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE units (
    id          TEXT PRIMARY KEY,
    letter      TEXT NOT NULL,
    ord         INT  NOT NULL,
    color       TEXT NOT NULL DEFAULT '#7C3AED',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_deleted  BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at  TIMESTAMPTZ NULL
);

CREATE TABLE nodes (
    id          TEXT PRIMARY KEY,
    unit_id     TEXT NOT NULL REFERENCES units(id),
    ord         INT  NOT NULL,
    type        TEXT NOT NULL CHECK (type IN ('lesson','chest','review','intro')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_deleted  BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at  TIMESTAMPTZ NULL
);
CREATE INDEX nodes_unit_idx ON nodes(unit_id);

CREATE TABLE questions (
    id                 TEXT PRIMARY KEY,
    node_id            TEXT NOT NULL REFERENCES nodes(id),
    type               TEXT NOT NULL,
    question_text      TEXT NOT NULL DEFAULT '',
    question_audio_url TEXT NULL,
    media_label        TEXT NULL,
    options            JSONB NOT NULL DEFAULT '[]'::jsonb,
    correct_answer     TEXT NOT NULL DEFAULT '',
    ord                INT  NOT NULL DEFAULT 0,
    syllable_count     INT  NULL,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_deleted         BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at         TIMESTAMPTZ NULL
);
CREATE INDEX questions_node_idx ON questions(node_id, ord);
CREATE INDEX questions_type_idx ON questions(type);

CREATE TABLE profiles (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    local_id         UUID NULL,                -- id generated on the child's device
    name             TEXT NOT NULL,
    username         TEXT NOT NULL,
    dob              TEXT NULL,
    avatar_url       TEXT NULL,
    diamonds         INT  NOT NULL DEFAULT 0,
    streak_days      INT  NOT NULL DEFAULT 0,
    last_active_date TEXT NULL,
    total_score      INT  NOT NULL DEFAULT 0,
    joined_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    password_hash    TEXT NULL,                -- "salt:sha256hex", computed in the browser
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_deleted       BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at       TIMESTAMPTZ NULL
);
CREATE UNIQUE INDEX profiles_username_uq ON profiles (lower(username)) WHERE is_deleted = FALSE;
CREATE INDEX profiles_local_id_idx ON profiles (local_id);

CREATE TABLE node_progress (
    user_id        UUID NOT NULL REFERENCES profiles(id),
    node_id        TEXT NOT NULL,
    stars          INT  NOT NULL DEFAULT 0,
    completed      BOOLEAN NOT NULL DEFAULT FALSE,
    best_accuracy  INT  NOT NULL DEFAULT 0,
    attempts       INT  NOT NULL DEFAULT 0,
    last_played_at TIMESTAMPTZ NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_deleted     BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at     TIMESTAMPTZ NULL,
    PRIMARY KEY (user_id, node_id)
);

CREATE TABLE friendships (
    user_id    UUID NOT NULL REFERENCES profiles(id),
    friend_id  UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ NULL,
    PRIMARY KEY (user_id, friend_id),
    CHECK (user_id <> friend_id)
);
CREATE INDEX friendships_friend_idx ON friendships(friend_id);

CREATE TABLE question_stats (
    user_id       UUID NOT NULL REFERENCES profiles(id),
    question_type INT  NOT NULL,
    attempts      INT  NOT NULL DEFAULT 0,
    correct       INT  NOT NULL DEFAULT 0,
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, question_type)
);

CREATE TABLE question_reports (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id       TEXT NOT NULL,
    node_id           TEXT NULL,
    question_type     TEXT NULL,
    question_snapshot JSONB NULL,
    description       TEXT NULL,
    reporter_username TEXT NULL,
    status            TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved')),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_deleted        BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at        TIMESTAMPTZ NULL
);

-- Audio files live on disk (/srv/tichi/audio/<path>); this table records what exists.
CREATE TABLE audio_objects (
    path         TEXT PRIMARY KEY,
    content_type TEXT NOT NULL,
    size_bytes   BIGINT NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- +goose Down
DROP TABLE IF EXISTS audio_objects;
DROP TABLE IF EXISTS question_reports;
DROP TABLE IF EXISTS question_stats;
DROP TABLE IF EXISTS friendships;
DROP TABLE IF EXISTS node_progress;
DROP TABLE IF EXISTS profiles;
DROP TABLE IF EXISTS questions;
DROP TABLE IF EXISTS nodes;
DROP TABLE IF EXISTS units;
