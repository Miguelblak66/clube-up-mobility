ALTER TABLE member_users ADD COLUMN salt TEXT;
ALTER TABLE partner_users ADD COLUMN salt TEXT;
ALTER TABLE administradores ADD COLUMN salt TEXT;

-- Optional migration for existing legacy rows:
-- UPDATE member_users SET salt = NULL WHERE salt IS NULL;
-- UPDATE partner_users SET salt = NULL WHERE salt IS NULL;
-- UPDATE administradores SET salt = NULL WHERE salt IS NULL;
