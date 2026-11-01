-- +goose Up
-- The browser sends "salt:sha256hex". The server keeps the salt (public, needed for login) and
-- stores bcrypt(sha256hex) in password_hash, so a leaked database cannot be replayed as logins.
ALTER TABLE profiles ADD COLUMN password_salt TEXT NULL;

-- +goose Down
ALTER TABLE profiles DROP COLUMN IF EXISTS password_salt;
