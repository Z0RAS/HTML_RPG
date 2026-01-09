CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS characters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    class TEXT NOT NULL DEFAULT 'warrior',
    level INTEGER DEFAULT 1,
    xp INTEGER DEFAULT 0,

    health INTEGER DEFAULT 100,
    max_health INTEGER DEFAULT 100,
    mana INTEGER DEFAULT 50,
    max_mana INTEGER DEFAULT 50,

    strength INTEGER DEFAULT 5,
    agility INTEGER DEFAULT 5,
    intelligence INTEGER DEFAULT 5,

    crit_chance REAL DEFAULT 0.05,
    crit_damage REAL DEFAULT 1.5,

    armor INTEGER DEFAULT 0,
    damage INTEGER DEFAULT 5,

    health_regen REAL DEFAULT 0.5,
    mana_regen REAL DEFAULT 0.3,

    skill_points INTEGER DEFAULT 0,
    skill_tree_data TEXT,
    inventory_json TEXT,
    equipment_json TEXT,
    money INTEGER DEFAULT 0,

    FOREIGN KEY(user_id) REFERENCES users(id)
);
-- Items table: use `slot` only (no separate `type`).
CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    slot TEXT NOT NULL,
    rarity TEXT DEFAULT 'common',
    icon INTEGER DEFAULT 0,
    price INTEGER DEFAULT 0,
    value INTEGER DEFAULT 0,
    bonus_health INTEGER DEFAULT 0,
    bonus_mana INTEGER DEFAULT 0,
    bonus_strength INTEGER DEFAULT 0,
    bonus_agility INTEGER DEFAULT 0,
    bonus_intelligence INTEGER DEFAULT 0,
    bonus_armor INTEGER DEFAULT 0,
    bonus_damage INTEGER DEFAULT 0
);

-- Note: `inventory` and `equipment` are now tracked per-character as JSON in the `characters` table
-- (columns `inventory_json` and `equipment_json`). We no longer create separate tables here.

CREATE TABLE IF NOT EXISTS classes (
    name TEXT PRIMARY KEY,
    base_health INTEGER,
    base_mana INTEGER,
    base_strength INTEGER,
    base_agility INTEGER,
    base_intelligence INTEGER,
    base_armor INTEGER,
    base_damage INTEGER
);

INSERT OR IGNORE INTO classes (name, base_health, base_mana, base_strength, base_agility, base_intelligence, base_armor, base_damage) VALUES ('warrior', 150, 30, 10, 5, 2, 5, 10);
INSERT OR IGNORE INTO classes (name, base_health, base_mana, base_strength, base_agility, base_intelligence, base_armor, base_damage) VALUES ('mage', 80, 150, 2, 4, 12, 0, 4);
INSERT OR IGNORE INTO classes (name, base_health, base_mana, base_strength, base_agility, base_intelligence, base_armor, base_damage) VALUES ('tank', 200, 40, 6, 3, 3, 10, 6);

INSERT OR IGNORE INTO items (name, slot, rarity, icon, price, value, bonus_health, bonus_mana, bonus_strength, bonus_agility, bonus_intelligence, bonus_armor, bonus_damage) VALUES
-- Head (5 rarities)
('Medvilnės kepurė',      'head', 'common',   0, 10, 5, 0, 0, 0, 0, 0, 0, 0),
('Mago gobtuvas',         'head', 'uncommon', 1, 25, 15, 0, 20, 0, 0, 3, 0, 0),
('Išminties karūna',      'head', 'rare',     2, 60, 35, 20, 10, 0, 0, 4, 0, 1),
('Amžinoji karūna',       'head', 'epic',     3, 150, 80, 40, 30, 0, 0, 6, 0, 2),
('Legendų diadema',       'head', 'legendary',4, 400, 200, 80, 50, 2, 2,10, 0, 4),

-- Armor (chest)
('Skraistė',              'armor', 'common',   5, 15, 8, 0, 10, 0, 0, 1, 0, 0),
('Kovos skraistė',        'armor', 'uncommon',6, 35, 20, 10, 10, 0, 0, 3, 0, 1),
('Sargų šarvai',          'armor', 'rare',     7, 80, 45, 50, 0, 0, 0, 0,10, 0),
('Amžinoji skraistė',     'armor', 'epic',     8, 200, 120, 30,50, 0, 0,10, 0, 5),
('Drakono šarvai',        'armor', 'legendary',9, 500, 300, 100,0, 5, 2, 0,18, 0),

-- Gloves
('Vilnonės pirštinės',    'gloves','common',   10, 8, 4, 0, 0, 0, 0, 0, 0, 0),
('Odinės pirštinės',      'gloves','uncommon',11, 20, 10, 0, 1, 1, 0, 0, 1, 0),
('Galingumo gauntletai',  'gloves','rare',     12, 50, 30, 0, 0, 3, 0, 0, 3, 0),
('Arkaninės pirštinės',   'gloves','epic',     13, 120, 80, 0, 20, 0, 0, 4, 0, 2),
('Titano pirštinės',      'gloves','legendary',14, 300, 200, 20, 0, 6, 4, 0, 2, 6),

-- Boots
('Odiniai batai',         'boots','common',    15, 12, 6, 0, 0, 1, 0, 0, 0, 0),
('Medžiotojo batai',      'boots','uncommon', 16, 30, 15, 0, 0, 3, 0, 1, 1, 0),
('Greitumo batai',        'boots','rare',      17, 70, 35, 0, 0, 5, 0, 1, 2, 0),
('Vėjo bėgiko batai',     'boots','epic',      18, 180, 90, 0, 0, 8, 0, 3, 4, 0),
('Koloso batai',          'boots','legendary',19, 450, 250, 50, 0, 2, 6, 0, 8, 6),

-- Weapon
('Rūdijęs kalavijas',     'weapon','common',   20, 25, 12, 0, 0, 1, 0, 0, 0, 2),
('Treniruočių lazda',     'weapon','common',   21, 20, 10, 0, 5, 0, 0, 2, 0, 1),
('Plieninis kalavijas',   'weapon','uncommon', 22, 60, 20, 0, 0, 3, 0, 0, 0, 5),
('Riterio kalavijas',     'weapon','rare',     23, 140, 35, 0, 0, 5, 1, 0, 0, 9),
('Drakonų žudikas',       'weapon','epic',    24, 350, 80, 20, 0, 8, 2, 0, 0, 18),
('Eskalibur',             'weapon','legendary',25, 800, 50, 50, 0, 12, 4, 0, 0, 30),

-- Rings
('Vario žiedas',          'ring','common',     26, 5, 1, 0, 0, 0, 0, 0, 0, 0),
('Sidabrinis žiedas',     'ring','uncommon',   27, 15, 5, 0, 1, 0, 0, 0, 1, 0),
('Galios žiedas',         'ring','rare',       28, 40, 10, 0, 3, 1, 0, 0, 4, 0),
('Valdymo žiedas',        'ring','epic',       29, 100, 20, 20, 0, 0, 4, 0, 2, 0),
('Amžinybės žiedas',      'ring','legendary', 30, 250, 40, 40, 5, 3, 5, 2, 6, 0);
