// =============================================================================
// DirtBid AI — Database Schema
// =============================================================================
// Core tables for users, equipment, materials, projects, bids, and regional
// cost indices. Designed for SQLite with offline-first support.

export const CREATE_TABLES = `
-- Users & team settings
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  company_name TEXT,
  phone TEXT,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'owner_operator',
  subscription_tier TEXT DEFAULT 'solo',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS user_settings (
  user_id TEXT PRIMARY KEY,
  default_labor_rate REAL DEFAULT 65.00,
  default_equipment_rate REAL DEFAULT 95.00,
  default_profit_margin REAL DEFAULT 15.0,
  default_overhead_percent REAL DEFAULT 10.0,
  default_sales_tax_percent REAL DEFAULT 0.0,
  default_bond_insurance_percent REAL DEFAULT 2.0,
  regional_cost_index REAL DEFAULT 1.0,
  preferred_soil_type TEXT DEFAULT 'common-earth',
  currency TEXT DEFAULT 'USD',
  date_format TEXT DEFAULT 'MM/DD/YYYY',
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Equipment fleet
CREATE TABLE IF NOT EXISTS equipment (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  hourly_rate REAL NOT NULL,
  fuel_consumption_gal_per_hr REAL,
  maintenance_cost_per_hr REAL,
  is_owned INTEGER DEFAULT 1,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Material prices
CREATE TABLE IF NOT EXISTS material_prices (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  material_name TEXT NOT NULL,
  unit TEXT NOT NULL,
  cost_per_unit REAL NOT NULL,
  supplier TEXT,
  region TEXT,
  effective_date TEXT DEFAULT (datetime('now')),
  notes TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Regional cost indices
CREATE TABLE IF NOT EXISTS regional_cost_indices (
  id TEXT PRIMARY KEY,
  region_name TEXT NOT NULL,
  region_code TEXT,
  cost_index REAL DEFAULT 1.0,
  labor_index REAL DEFAULT 1.0,
  material_index REAL DEFAULT 1.0,
  equipment_index REAL DEFAULT 1.0,
  description TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Projects
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  location TEXT,
  description TEXT,
  status TEXT DEFAULT 'draft',
  customer_name TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Bids
CREATE TABLE IF NOT EXISTS bids (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  status TEXT DEFAULT 'draft',
  subtotal_before_markup REAL DEFAULT 0,
  total_markup REAL DEFAULT 0,
  subtotal_after_markup REAL DEFAULT 0,
  overhead_amount REAL DEFAULT 0,
  profit_amount REAL DEFAULT 0,
  sales_tax_amount REAL DEFAULT 0,
  bond_insurance_amount REAL DEFAULT 0,
  regional_adjustment REAL DEFAULT 0,
  grand_total REAL DEFAULT 0,
  bid_data TEXT,
  notes TEXT,
  valid_until TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Bid modules (which engines were used)
CREATE TABLE IF NOT EXISTS bid_modules (
  id TEXT PRIMARY KEY,
  bid_id TEXT NOT NULL,
  module_type TEXT NOT NULL,
  label TEXT,
  base_cost REAL DEFAULT 0,
  adjusted_cost REAL DEFAULT 0,
  markup_percent REAL DEFAULT 0,
  module_inputs TEXT,
  module_outputs TEXT,
  FOREIGN KEY (bid_id) REFERENCES bids(id) ON DELETE CASCADE
);
`;

export const SEED_REGIONAL_INDICES = `
INSERT OR IGNORE INTO regional_cost_indices (id, region_name, region_code, cost_index, labor_index, material_index, equipment_index, description) VALUES
  ('rci-us-ne', 'Northeast US', 'US-NE', 1.15, 1.20, 1.10, 1.12, 'Higher labor & material costs in NE corridor'),
  ('rci-us-se', 'Southeast US', 'US-SE', 0.92, 0.88, 0.95, 0.90, 'Lower labor costs, moderate materials'),
  ('rci-us-mw', 'Midwest US', 'US-MW', 0.95, 0.92, 0.97, 0.93, 'Average national costs'),
  ('rci-us-sw', 'Southwest US', 'US-SW', 0.98, 0.95, 1.00, 0.96, 'Growing regions with moderate costs'),
  ('rci-us-w', 'West Coast US', 'US-W', 1.20, 1.25, 1.15, 1.18, 'Highest labor & equipment costs'),
  ('rci-ca', 'Canada (Average)', 'CA', 1.08, 1.10, 1.05, 1.06, 'Slightly higher due to climate factors'),
`;
