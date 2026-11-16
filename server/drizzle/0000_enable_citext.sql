-- Custom SQL migration file, put your code below! --
-- citext backs the case-insensitive unique email on users; it must exist before that table is created.
CREATE EXTENSION IF NOT EXISTS citext;