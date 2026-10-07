CREATE TABLE IF NOT EXISTS club_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  email TEXT,
  profile TEXT NOT NULL CHECK(profile IN ('motorista','cliente')),
  city TEXT NOT NULL,
  driver_id TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_club_members_profile ON club_members(profile);
CREATE INDEX IF NOT EXISTS idx_club_members_status ON club_members(status);
CREATE INDEX IF NOT EXISTS idx_club_members_created_at ON club_members(created_at);

CREATE TABLE IF NOT EXISTS partners (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  company_name TEXT NOT NULL,
  responsible_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  category TEXT NOT NULL,
  city TEXT NOT NULL,
  address TEXT,
  benefit TEXT NOT NULL,
  logo_url TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive','pending')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_partners_status ON partners(status);
CREATE INDEX IF NOT EXISTS idx_partners_category ON partners(category);

CREATE TABLE IF NOT EXISTS partner_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  partner_id INTEGER NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(partner_id) REFERENCES partners(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_partner_users_email ON partner_users(email);

CREATE TABLE IF NOT EXISTS member_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(member_id) REFERENCES club_members(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_member_users_email ON member_users(email);

CREATE TABLE IF NOT EXISTS benefit_uses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  partner_id INTEGER NOT NULL,
  member_id INTEGER,
  member_code TEXT,
  benefit_label TEXT,
  used_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(partner_id) REFERENCES partners(id) ON DELETE CASCADE,
  FOREIGN KEY(member_id) REFERENCES club_members(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_benefit_uses_partner ON benefit_uses(partner_id);
CREATE INDEX IF NOT EXISTS idx_benefit_uses_used_at ON benefit_uses(used_at);
CREATE INDEX IF NOT EXISTS idx_benefit_uses_member_code ON benefit_uses(member_code);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_type TEXT NOT NULL CHECK(actor_type IN ('admin','partner','member','system')),
  actor_id INTEGER,
  partner_id INTEGER,
  action TEXT NOT NULL,
  details TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_partner ON audit_logs(partner_id);

CREATE TABLE IF NOT EXISTS administradores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  senha TEXT NOT NULL,
  criado_em TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessoes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token TEXT NOT NULL UNIQUE,
  usuario_id INTEGER NOT NULL,
  tipo_usuario TEXT NOT NULL,
  criado_em TEXT DEFAULT CURRENT_TIMESTAMP,
  expira_em TEXT NOT NULL
);
