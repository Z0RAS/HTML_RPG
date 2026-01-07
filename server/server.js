import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import sqlite3 from "sqlite3";
import bcrypt from "bcrypt";
import bodyParser from "body-parser";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import jwt from "jsonwebtoken";
import { rollLoot } from "./loot.js";
import { calculateFinalStats } from "./stats.js";
import * as storage from "./storage.js";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";
app.use(bodyParser.json());
app.use(cors());

// Disable caching for development
app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
});

// Resolve project root so we can serve index.html and assets
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendPath = path.join(__dirname, "../");

// Serve static frontend files (index.html at project root)
app.use(express.static(frontendPath));
app.get("/", (req, res) => res.sendFile(path.join(frontendPath, "index.html")));
// Avoid unnecessary favicon errors
app.get("/favicon.ico", (req, res) => res.sendStatus(204));

// DB INIT
const dbPath = path.join(__dirname, "game.db");
if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, "");
}

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Failed to open database', err);
        process.exit(1);
    }
});


// Promisified DB helpers
function dbRunAsync(sql, params = []) {
    return new Promise((resolve, reject) => db.run(sql, params, function (err) {
        if (err) return reject(err);
        resolve(this);
    }));
}

function dbGetAsync(sql, params = []) {
    return new Promise((resolve, reject) => db.get(sql, params, (err, row) => err ? reject(err) : resolve(row)));
}

function dbAllAsync(sql, params = []) {
    return new Promise((resolve, reject) => db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows)));
}

// Ensure new columns exist (merged_class, ultimate_skill) for persistence
async function ensureCharacterColumns() {
    try {
        const columns = await dbAllAsync("PRAGMA table_info(characters)");
        const names = columns.map(c => c.name);
        const alters = [];
        if (!names.includes("merged_class")) {
            alters.push(dbRunAsync("ALTER TABLE characters ADD COLUMN merged_class TEXT"));
        }
        if (!names.includes("ultimate_skill")) {
            alters.push(dbRunAsync("ALTER TABLE characters ADD COLUMN ultimate_skill TEXT"));
        }
        await Promise.all(alters);
    } catch (e) {
        console.error("Failed to ensure character columns:", e);
    }
}

// Kick off column check (best-effort, non-blocking)
ensureCharacterColumns();

// Load schema and make class and items inserts idempotent (avoid UNIQUE constraint on restart)
const schemaPath = path.join(__dirname, "schema.sql");
let schema = fs.readFileSync(schemaPath, "utf8");
schema = schema.replace(/INSERT\s+INTO\s+classes/ig, 'INSERT OR IGNORE INTO classes');
schema = schema.replace(/INSERT\s+INTO\s+items/ig, 'INSERT OR IGNORE INTO items');
db.exec(schema, (err) => {
    if (err) {
        if (err.code === 'SQLITE_CONSTRAINT') {
            console.warn('Ignored SQLITE_CONSTRAINT during schema exec:', err.message);
        } else {
            console.error('Schema exec error:', err);
        }
    }
});

// ===== AUTHENTICATION MIDDLEWARE =====
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ success: false, error: "No token provided" });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ success: false, error: "Invalid token" });
        }
        req.user = user; // { userId: 123 }
        next();
    });
}

// Helper to verify character ownership
async function verifyCharacterOwnership(charId, userId) {
    const char = await dbGetAsync("SELECT user_id FROM characters WHERE id = ?", [charId]);
    return char && char.user_id === userId;
}

// Input validation helper
function validateInput(fields) {
    for (const [key, value] of Object.entries(fields)) {
        if (value === undefined || value === null) {
            return { valid: false, error: `${key} is required` };
        }
        // Allow empty strings but trim them
        const trimmed = String(value).trim();
        if (trimmed === '') {
            return { valid: false, error: `${key} cannot be empty` };
        }
    }
    return { valid: true };
}

// ===== PUBLIC ENDPOINTS =====

// REGISTER
app.post("/register", async (req, res) => {
    const { username, password } = req.body;

    console.log("Register attempt:", { username, password: password ? "***" : "empty" });

    // Validate input
    const validation = validateInput({ username, password });
    if (!validation.valid) {
        console.log("Validation failed:", validation.error);
        return res.status(400).json({ success: false, error: validation.error });
    }

    if (username.length < 3 || password.length < 6) {
        console.log("Length check failed:", { usernameLen: username.length, passwordLen: password.length });
        return res.status(400).json({ success: false, error: "Username must be 3+ chars, password 6+ chars" });
    }

    db.get("SELECT * FROM users WHERE username = ?", [username], async (err, row) => {
        if (row) {
            return res.status(400).json({ success: false, error: "User exists" });
        }

        const hash = await bcrypt.hash(password, 10);

        db.run(
            "INSERT INTO users (username, password_hash) VALUES (?, ?)",
            [username, hash],
            function (err) {
                if (err) return res.status(500).json({ success: false, error: "Database error" });

                const userId = this.lastID;
                const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '24h' });
                res.json({ success: true, userId, token });
            }
        );
    });
});

// In-memory rate limit for character creation (userId -> timestamp)
const characterCreateTimestamps = new Map();


// ===== PROTECTED ENDPOINTS =====
app.post("/createCharacter", authenticateToken, async (req, res) => {

    const { name, className } = req.body;
    const userId = req.user.userId; // From JWT token

    // Rate limit: 1 character creation per 10 seconds per user
    const now = Date.now();
    const last = characterCreateTimestamps.get(userId) || 0;
    if (now - last < 10000) {
        return res.status(429).json({ success: false, error: "Palaukite 10s prieš bandydami sukurti naują charakterį" });
    }
    characterCreateTimestamps.set(userId, now);

    // Character limit: max 4 per user
    try {
        const userChars = await dbAllAsync("SELECT id FROM characters WHERE user_id = ?", [userId]);
        if (userChars && userChars.length >= 4) {
            return res.status(400).json({ success: false, error: "Charakterių limitas pasiektas 4/4" });
        }
    } catch (e) {
        return res.status(500).json({ success: false, error: "Database error (character limit check)" });
    }

    const classes = {
        warrior: {
            health:150, max_health:150,
            mana:30, max_mana:30,
            strength:10, agility:5, intelligence:2,
            crit_chance:0.05, crit_damage:1.5,
            armor:5, damage:10,
            health_regen:1.0, mana_regen:0.2
        },
        mage: {
            health:80, max_health:80,
            mana:150, max_mana:150,
            strength:2, agility:4, intelligence:12,
            crit_chance:0.10, crit_damage:2.0,
            armor:0, damage:4,
            health_regen:0.3, mana_regen:1.5
        },
        tank: {
            health:200, max_health:200,
            mana:40, max_mana:40,
            strength:6, agility:3, intelligence:3,
            crit_chance:0.02, crit_damage:1.2,
            armor:10, damage:6,
            health_regen:1.5, mana_regen:0.3
        }
    };

    const c = classes[className];
    if (!c) return res.status(400).json({ success: false, error: "Invalid class" });

    // Validate input
    const validation = validateInput({ name, className });
    if (!validation.valid) {
        return res.status(400).json({ success: false, error: validation.error });
    }

    try {
        const result = await dbRunAsync(
            `INSERT INTO characters (
                user_id, name, class, level, xp,
                health, max_health, mana, max_mana,
                strength, agility, intelligence,
                crit_chance, crit_damage,
                armor, damage,
                health_regen, mana_regen
            ) VALUES (?, ?, ?, 1, 0,
                ?, ?, ?, ?,
                ?, ?, ?,
                ?, ?,
                ?, ?,
                ?, ?
            )`,
            [
                userId, name, className,
                c.health, c.max_health, c.mana, c.max_mana,
                c.strength, c.agility, c.intelligence,
                c.crit_chance, c.crit_damage,
                c.armor, c.damage,
                c.health_regen, c.mana_regen
            ]
        );

        const charId = result.lastID;

        const slots = ["head", "armor", "gloves", "boots", "weapon", "ring1", "ring2"];
        await storage.initCharacterEquipment(charId, slots);

        const starterItems = {
            warrior: [
                { itemId: 1, qty: 1 },
                { itemId: 2, qty: 1 },
                { itemId: 4, qty: 1 }
            ],
            mage: [
                { itemId: 5, qty: 1 },
                { itemId: 3, qty: 1 },
                { itemId: 8, qty: 1 }
            ],
            tank: [
                { itemId: 6, qty: 1 },
                { itemId: 7, qty: 1 },
                { itemId: 4, qty: 1 }
            ]
        };

        const itemsToGive = starterItems[className] || [];
        await storage.initCharacterInventory(charId, itemsToGive);

        for (const it of itemsToGive) {
            try {
                const row = await dbGetAsync("SELECT slot FROM items WHERE id = ?", [it.itemId]);
                if (!row || !row.slot) continue;
                const itemSlot = row.slot;
                const map = {
                    head: 'head',
                    weapon: 'weapon',
                    chest: 'armor',
                    legs: 'boots',
                    offhand: 'ring1',
                    ring: 'ring1'
                };
                const slotName = map[itemSlot] || 'armor';
                await storage.setEquipment(charId, slotName, it.itemId);
            } catch (e) {
                // ignore per-item errors
            }
        }

        res.json({ success: true, charId });
    } catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
});

// Delete character endpoint
app.delete("/character/:charId", authenticateToken, async (req, res) => {
    const charId = parseInt(req.params.charId);
    
    try {
        // Verify character belongs to user
        const character = await dbGetAsync(
            "SELECT user_id FROM characters WHERE id = ?",
            [charId]
        );
        
        if (!character) {
            return res.status(404).json({ success: false, error: "Character not found" });
        }
        
        if (character.user_id !== req.user.userId) {
            return res.status(403).json({ success: false, error: "Not your character" });
        }
        
        // Delete character (inventory and equipment are stored as JSON in the character row)
        await dbRunAsync("DELETE FROM characters WHERE id = ?", [charId]);
        
        res.json({ success: true });
    } catch (error) {
        console.error("Error deleting character:", error);
        res.status(500).json({ success: false, error: "Database error" });
    }
});

app.post("/inventory/add", authenticateToken, async (req, res) => {
    const { charId, itemId, quantity } = req.body;
    
    // Verify ownership
    const isOwner = await verifyCharacterOwnership(charId, req.user.userId);
    if (!isOwner) {
        return res.status(403).json({ success: false, error: "Unauthorized" });
    }

    try {
        await storage.addInventoryItem(charId, itemId, quantity || 1);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, error: "Database error" });
    }
});


app.get("/equipment/:charId", authenticateToken, async (req, res) => {
    const charId = req.params.charId;

    // Verify ownership
    const isOwner = await verifyCharacterOwnership(charId, req.user.userId);
    if (!isOwner) {
        return res.status(403).json({ error: "Unauthorized" });
    }
    const map = await storage.getEquipmentMap(charId);
    const slots = [];

    const ids = Object.values(map).filter(Boolean);
    if (ids.length === 0) return res.json([]);

    try {
        const rows = await dbAllAsync(`SELECT * FROM items WHERE id IN (${ids.map(() => '?').join(',')})`, ids);
        for (const slotName in map) {
            const itemId = map[slotName];
            const item = rows.find(r => r.id === itemId) || null;
            slots.push(Object.assign({ slot: slotName }, item));
        }
        res.json(slots);
    } catch (e) {
        res.json([]);
    }
});

app.post("/equipment/equip", authenticateToken, async (req, res) => {
    const { charId, slot, itemId } = req.body;

    // Verify ownership
    const isOwner = await verifyCharacterOwnership(charId, req.user.userId);
    if (!isOwner) {
        return res.status(403).json({ success: false, error: "Unauthorized" });
    }

    try {
        await storage.setEquipment(charId, slot, itemId);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, error: "Database error" });
    }
});


app.post("/equipment/unequip", authenticateToken, async (req, res) => {
    const { charId, slot } = req.body;

    // Verify ownership
    const isOwner = await verifyCharacterOwnership(charId, req.user.userId);
    if (!isOwner) {
        return res.status(403).json({ success: false, error: "Unauthorized" });
    }

    try {
        await storage.setEquipment(charId, slot, null);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, error: "Database error" });
    }
});

app.get("/inventory/:charId", authenticateToken, async (req, res) => {
    const charId = req.params.charId;

    // Verify ownership
    const isOwner = await verifyCharacterOwnership(charId, req.user.userId);
    if (!isOwner) {
        return res.status(403).json({ error: "Unauthorized" });
    }
    const entries = await storage.getInventoryEntries(charId);
    if (!entries || entries.length === 0) return res.json([]);

    const ids = entries.map(e => e.itemId);
    try {
        const rows = await dbAllAsync(`SELECT * FROM items WHERE id IN (${ids.map(() => '?').join(',')})`, ids);
        const out = entries.map(en => {
            const item = rows.find(r => r.id === en.itemId) || {};
            return Object.assign({}, item, { quantity: en.quantity });
        });
        res.json(out);
    } catch (e) {
        res.json([]);
    }
});

// LOGIN
app.post("/login", (req, res) => {
    const { username, password } = req.body;

    // Validate input
    const validation = validateInput({ username, password });
    if (!validation.valid) {
        return res.status(400).json({ success: false, error: validation.error });
    }

    db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
        if (!user) return res.status(401).json({ success: false, error: "Invalid credentials" });

        if (!bcrypt.compareSync(password, user.password_hash))
            return res.status(401).json({ success: false, error: "Invalid credentials" });

        // Check if user is already connected via WebSocket
        const existingSocketId = activeConnections.get(user.id);
        if (existingSocketId) {
            const existingSocket = io.sockets.sockets.get(existingSocketId);
            if (existingSocket && existingSocket.connected) {
                return res.status(409).json({ 
                    success: false, 
                    error: "Naudotojas jau prijungtas" 
                });
            }
        }

        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ success: true, userId: user.id, token });
    });
});

// GET CHARACTER LIST
app.get("/characters/:userId", authenticateToken, (req, res) => {
    // Verify user can only get their own characters
    if (req.user.userId !== parseInt(req.params.userId)) {
        return res.status(403).json({ error: "Unauthorized" });
    }

    db.all(
        "SELECT * FROM characters WHERE user_id = ?",
        [req.params.userId],
        (err, rows) => {
            if (err) return res.status(500).json({ error: "Database error" });
            res.json(rows);
        }
    );
});

// GET CHARACTER STATS
app.get("/character/:charId", authenticateToken, async (req, res) => {
    const charId = req.params.charId;

    // Verify ownership
    const isOwner = await verifyCharacterOwnership(charId, req.user.userId);
    if (!isOwner) {
        return res.status(403).json({ error: "Unauthorized" });
    }

    db.get(
        "SELECT * FROM characters WHERE id = ?",
        [charId],
        (err, row) => {
            if (err) return res.status(500).json({ error: "Database error" });
            res.json(row);
        }
    );
});

app.get("/characterStats/:charId", authenticateToken, async (req, res) => {
    const charId = req.params.charId;

    // Verify ownership
    const isOwner = await verifyCharacterOwnership(charId, req.user.userId);
    if (!isOwner) {
        return res.status(403).json({ error: "Unauthorized" });
    }

    try {
        const base = await dbGetAsync("SELECT * FROM characters WHERE id = ?", [charId]);
        if (!base) return res.json({ error: "Character not found" });

        const equipMap = await storage.getEquipmentMap(charId);
        const ids = Object.values(equipMap).filter(Boolean);
        if (ids.length === 0) {
            const finalStats = calculateFinalStats(base, []);
            finalStats.skillTreeData = base.skill_tree_data;
            return res.json(finalStats);
        }

        const rows = await dbAllAsync(`SELECT * FROM items WHERE id IN (${ids.map(() => '?').join(',')})`, ids);
        const finalStats = calculateFinalStats(base, rows || []);
        finalStats.skillTreeData = base.skill_tree_data;
        res.json(finalStats);
    } catch (e) {
        res.status(500).json({ error: 'Database error' });
    }
});

app.put("/characterStats/:charId", authenticateToken, async (req, res) => {
    const charId = req.params.charId;
    const stats = req.body;

    // Verify ownership
    const isOwner = await verifyCharacterOwnership(charId, req.user.userId);
    if (!isOwner) {
        return res.status(403).json({ success: false, error: "Unauthorized" });
    }
    
    try {
        // Update character stats in database
        await dbRunAsync(`
            UPDATE characters SET 
                level = ?, xp = ?, health = ?, max_health = ?, mana = ?, max_mana = ?,
                strength = ?, agility = ?, intelligence = ?, 
                crit_chance = ?, crit_damage = ?, armor = ?, damage = ?,
                health_regen = ?, mana_regen = ?, money = ?, skill_points = ?,
                skill_tree_data = ?,
                merged_class = ?, ultimate_skill = ?
            WHERE id = ?
        `, [
            stats.level, stats.xp, stats.health, stats.maxHealth, stats.mana, stats.maxMana,
            stats.strength, stats.agility, stats.intelligence,
            stats.critChance, stats.critDamage, stats.armor, stats.damage,
            stats.healthRegen, stats.manaRegen, stats.money, stats.skillPoints || 0,
            stats.skillTreeData || null,
            stats.mergedClass || null, stats.ultimateSkill || null,
            charId
        ]);
        
        res.json({ success: true });
    } catch (e) {
        console.error("Error updating character stats:", e);
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

app.get("/item/:itemId", authenticateToken, async (req, res) => {
    const itemId = req.params.itemId;
    try {
        const item = await dbGetAsync("SELECT * FROM items WHERE id = ?", [itemId]);
        if (!item) return res.status(404).json({ error: "Item not found" });
        res.json(item);
    } catch (e) {
        res.status(500).json({ error: 'Database error' });
    }
});

app.get("/shop/items", authenticateToken, async (req, res) => {
    try {
        const items = await dbAllAsync("SELECT * FROM items ORDER BY rarity, price");
        res.json(items);
    } catch (e) {
        res.status(500).json({ error: 'Database error' });
    }
});

app.post("/enemy/kill", authenticateToken, async (req, res) => {
    const { charId } = req.body;

    // Verify ownership
    const isOwner = await verifyCharacterOwnership(charId, req.user.userId);
    if (!isOwner) {
        return res.status(403).json({ success: false, error: "Unauthorized" });
    }

    const itemId = rollLoot();

    if (!itemId) {
        return res.json({ success: true, dropped: false });
    }
    (async () => {
        try {
            await storage.addInventoryItem(charId, itemId, 1);
            res.json({ success: true, dropped: true, itemId });
        } catch (e) {
            res.json({ success: false });
        }
    })();
});

// ===== ADMIN ENDPOINTS (for debugging) =====
app.get("/admin/stats", async (req, res) => {
    try {
        const users = await dbAllAsync("SELECT id, username, created_at FROM users");
        const characters = await dbAllAsync("SELECT id, user_id, name, class, level FROM characters");
        const items = await dbAllAsync("SELECT COUNT(*) as count FROM items");
        
        res.json({
            totalUsers: users.length,
            totalCharacters: characters.length,
            totalItems: items[0].count,
            users,
            characters
        });
    } catch (e) {
        res.status(500).json({ error: String(e) });
    }
});

app.get("/admin/database", async (req, res) => {
    try {
        const users = await dbAllAsync("SELECT * FROM users");
        const characters = await dbAllAsync("SELECT * FROM characters");
        const items = await dbAllAsync("SELECT * FROM items LIMIT 20");
        
        res.json({ users, characters, items });
    } catch (e) {
        res.status(500).json({ error: String(e) });
    }
});

const PORT = process.env.PORT || 3000;

// ===== MULTIPLAYER HUB =====
const hubPlayers = new Map(); // userId -> {x, y, name, characterId}
const activeCharacters = new Map(); // characterId -> userId
const activeConnections = new Map(); // userId -> socketId

// Socket.io authentication middleware
io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
        return next(new Error("Authentication error"));
    }
    
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return next(new Error("Invalid token"));
        socket.userId = decoded.userId;
        next();
    });
});

io.on("connection", (socket) => {
    console.log(`✅ User ${socket.userId} connected via websocket (socket: ${socket.id})`);
    
    // Check for duplicate connection and reject the NEW one
    const existingSocketId = activeConnections.get(socket.userId);
    if (existingSocketId) {
        const existingSocket = io.sockets.sockets.get(existingSocketId);
        if (existingSocket && existingSocket.connected) {
            console.log(`⚠️ User ${socket.userId} already connected (existing socket: ${existingSocketId}), rejecting new connection`);
            socket.emit("error", "This account is already connected");
            socket.disconnect(true);
            return;
        } else {
            console.log(`♻️ Old connection ${existingSocketId} is stale, allowing new connection`);
        }
    }
    activeConnections.set(socket.userId, socket.id);
    
    // Join hub
    socket.on("joinHub", async (data) => {
        const { characterId, characterName, x, y } = data;
        
        // Check if this character is already playing
        const existingUserId = activeCharacters.get(characterId);
        if (existingUserId && existingUserId !== socket.userId) {
            console.log(`⚠️ Character ${characterName} (ID: ${characterId}) is already being played by user ${existingUserId}`);
            socket.emit("error", "This character is already being played");
            socket.disconnect(true);
            return;
        }
        
        // Check if this user already has an active hub session with a different character
        const existingPlayer = hubPlayers.get(socket.userId);
        if (existingPlayer && existingPlayer.characterId !== characterId) {
            console.log(`⚠️ User ${socket.userId} trying to play multiple characters simultaneously`);
            socket.emit("error", "You are already playing with another character");
            socket.disconnect(true);
            return;
        }
        
        activeCharacters.set(characterId, socket.userId);
        
        hubPlayers.set(socket.userId, {
            socketId: socket.id,
            userId: socket.userId,
            characterId,
            characterName,
            x: x || 400,
            y: y || 300
        });
        
        // Send current players to new player
        const players = Array.from(hubPlayers.values());
        socket.emit("hubPlayers", players);
        
        // Broadcast new player to others
        socket.broadcast.emit("playerJoined", {
            userId: socket.userId,
            characterId,
            characterName,
            x: x || 400,
            y: y || 300
        });
        
        console.log(`${characterName} joined hub`);
    });
    
    // Player movement
    socket.on("playerMove", (data) => {
        const player = hubPlayers.get(socket.userId);
        if (player) {
            player.x = data.x;
            player.y = data.y;
            player.direction = data.direction;
            player.animFrame = data.animFrame;
            
            // Broadcast to others
            socket.broadcast.emit("playerMoved", {
                userId: socket.userId,
                x: data.x,
                y: data.y,
                direction: data.direction,
                animFrame: data.animFrame
            });
        }
    });
    
    // Chat message
    socket.on("chatMessage", (message) => {
        const player = hubPlayers.get(socket.userId);
        if (player && message.trim()) {
            io.emit("chatMessage", {
                userId: socket.userId,
                characterName: player.characterName,
                message: message.trim(),
                timestamp: Date.now()
            });
        }
    });
    
    // Disconnect
    socket.on("disconnect", () => {
        console.log(`🔌 User ${socket.userId} disconnected (socket: ${socket.id})`);
        const player = hubPlayers.get(socket.userId);
        if (player) {
            console.log(`${player.characterName} left hub`);
            activeCharacters.delete(player.characterId);
            hubPlayers.delete(socket.userId);
            activeConnections.delete(socket.userId);
            socket.broadcast.emit("playerLeft", socket.userId);
        } else {
            // Clean up connection even if player wasn't in hub
            activeConnections.delete(socket.userId);
        }
    });
});

httpServer.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
