# 🎮 DUNGEON CRAWLER - DIEGIMO INSTRUKCIJA

## 📋 Sistemos reikalavimai

- **Operacinė sistema:** Windows 10/11, macOS, Linux
- **Node.js:** v16.0.0 ar naujesnė versija
- **RAM:** Mažiausiai 4GB
- **Naršyklė:** Chrome, Firefox, Edge (naujausios versijos)

---

## 🚀 DIEGIMO ŽINGSNIAI

### 1️⃣ **Patikrinti Node.js įdiegimą**

Atidarykite terminalą (Command Prompt arba PowerShell) ir įveskite:

```bash
node --version
```

Jei matote versiją (pvz., `v18.12.0`), Node.js įdiegtas. Jei ne, atsisiųskite iš: https://nodejs.org/

---

### 2️⃣ **Naviguoti į projekto katalogą**

Terminale įveskite:

```bash
cd C:\Users\Public\Desktop\Dungeon_crawler
```

Arba:
- Atidarykite `Dungeon_crawler` aplanką
- Dešiniuoju pelės mygtuku spustelėkite tuščioje vietoje
- Pasirinkite "Open in Terminal" arba "Git Bash Here"

---

### 3️⃣ **Įdiegti serverio priklausomybes**

Pereikite į `server` aplanką ir įdiekite paketus:

```bash
cd server
npm install
```

Turėtumėte pamatyti:
```
✓ Installed packages:
  - express
  - sqlite3
  - bcrypt
  - jsonwebtoken
  - socket.io
  - cors
```

---

### 4️⃣ **Sukurti duomenų bazę (automatiškai)**

Duomenų bazė `game.db` bus sukurta automatiškai paleidus serverį.

Arba rankiniu būdu:

```bash
sqlite3 game.db < schema.sql
```

---

### 5️⃣ **Paleisti serverį**

Įsitikinkite, kad esate `server` kataloge:

```bash
node server.js
```

Turėtumėte pamatyti:

```
🎮 Dungeon Crawler Server
📦 SQLite database initialized
🚀 Server running on http://localhost:3000
🔌 Socket.IO ready for multiplayer
```

**SVARBU:** Neuždarykite šio terminalo lango! Serveris turi veikti fone.

---

### 6️⃣ **Atidaryti žaidimą naršyklėje**

Atidarykite naršyklę ir eikite į:

```
http://localhost:3000
```

Arba tiesiog dukart spustelėkite `index.html` failą projekto šakninėje direktorijoje.

---

## 🎯 ŽAIDIMO PALEIDIMAS

### **Pirmas paleidimas:**

1. **Registracija:**
   - Įveskite vartotojo vardą
   - Įveskite slaptažodį (bent 3 simboliai)
   - Spauskite "SUKURTI PASKYRĄ"

2. **Sukurkite personažą:**
   - Įveskite personažo vardą
   - Pasirinkite klasę: Karys / Magas / Tankas
   - Spauskite "SUKURTI"

3. **Žaiskite!**
   - Esate hub'e (pagrindiniame mieste)
   - Eikite prie portalo (žalias portalas) - paspauskite `E`
   - Pasirinkite sunkumą
   - Tyrinėkite dungeon'us!

### **Vėlesni paleidmai:**

1. Prisijungimas: vartotojas + slaptažodis
2. Pasirinkite personažą
3. Žaiskite!

---

## ⌨️ VALDYMAS

| Klavišas | Veiksmas |
|----------|----------|
| **W, A, S, D** | Judėjimas |
| **Pelė (kairysis)** | Ataka / Skill naudojimas |
| **Q** | Skill 1 |
| **E** | Skill 2 / Interakcija (portalas, dungeon teleport) |
| **R** | Skill 3 |
| **F** | Skill 4 (Ultimate) |
| **I** | Inventorius |
| **K** | Skill Tree |
| **T** | Chat (multiplayer) |
| **ESC** | Nustatymai / Pause |

---

## 🐛 PROBLEMŲ SPRENDIMAS

### **Problema: "Cannot find module 'express'"**

**Sprendimas:**
```bash
cd server
npm install
```

---

### **Problema: "EADDRINUSE: address already in use ::3000"**

**Sprendimas:** Portas 3000 jau naudojamas.

**Windows:**
```bash
netstat -ano | findstr :3000
taskkill /PID <process_id> /F
```

**Mac/Linux:**
```bash
lsof -ti:3000 | xargs kill -9
```

Arba pakeiskite portą `server/server.js` faile:
```javascript
const PORT = 3001; // Pakeisti iš 3000 į 3001
```

---

### **Problema: "Database is locked"**

**Sprendimas:** Uždarykite visus kitus procesus, naudojančius `game.db`:

```bash
# Windows
del game.db
node server.js

# Mac/Linux
rm game.db
node server.js
```

---

### **Problema: Žaidimas neuzsikrauna / juodas ekranas**

**Sprendimas:**

1. Atidarykite naršyklės konsolę (`F12`)
2. Patikrinkite klaidas Console tab'e
3. Įsitikinkite, kad serveris veikia (`http://localhost:3000`)
4. Ištrinkite naršyklės cache:
   - Chrome: `Ctrl + Shift + Delete`
   - Firefox: `Ctrl + Shift + Delete`
   - Pasirinkite "Cached images and files"
   - Clear

---

### **Problema: "Cannot read property 'x' of undefined"**

**Sprendimas:** Ištrinkite localStorage:

1. Atidarykite naršyklės konsolę (`F12`)
2. Eikite į **Application** tab
3. Kairėje: **Local Storage** → `http://localhost:3000`
4. Dešiniuoju pelės mygtuku → **Clear**
5. Perkraukite puslapį (`Ctrl + F5`)

---

## 📁 PROJEKTO STRUKTŪRA

```
Dungeon_crawler/
├── index.html              # Pagrindinis HTML failas
├── server/                 # Backend serveris
│   ├── server.js          # Express serveris
│   ├── schema.sql         # DB schema
│   ├── loot.js            # Loot sistema
│   ├── stats.js           # Statistikos skaičiavimas
│   ├── storage.js         # DB operacijos
│   └── package.json       # Node.js priklausomybės
└── src/                   # Frontend kodas
    ├── main.js            # Žaidimo loop
    ├── player.js          # Žaidėjo logika
    ├── enemies.js         # Priešai
    ├── dungeon.js         # Dungeon generavimas
    ├── inventory.js       # Inventoriaus sistema
    ├── skills.js          # Skill sistema
    ├── skillTree.js       # Skill tree
    ├── api.js             # API komunikacija
    └── assets/            # Sprites, audio
```

---

## 🔧 SERVERIO KONFIGŪRACIJA

Jei reikia pakeisti serverio nustatymus, redaguokite `server/server.js`:

```javascript
const PORT = 3000;           // Serverio portas
const JWT_SECRET = "...";    // JWT saugumas
const DB_PATH = "./game.db"; // Duomenų bazės kelias
```

---

## 🌐 DIEGIMAS INTERNETE (OPTIONAL)

Jei norite, kad kiti galėtų žaisti:

### **1. Render.com (nemokamas):**

1. Eikite į https://render.com/
2. Sukurkite Web Service
3. Prijunkite GitHub repo
4. Build komanda: `cd server && npm install`
5. Start komanda: `node server.js`
6. Deploy!

### **2. Heroku:**

```bash
git init
git add .
git commit -m "Deploy"
heroku create dungeon-crawler-game
git push heroku main
```

---

## 📞 PAGALBA

Jei kyla problemų:

1. Patikrinkite, ar serveris veikia terminale
2. Patikrinkite naršyklės konsolę (`F12`)
3. Perskaitykite klaidos pranešimą
4. Ieškokite Google: "Node.js [klaidos pranešimas]"

---

## 🎉 SĖKMINGO ŽAIDIMO!

Dabar galite žaisti **Dungeon Crawler**! 

- Tyrinėkite dungeon'us
- Kovokite su priešais
- Rinkite loot'ą
- Kelkite lygius
- Kurkite skill tree
- Žaiskite su draugais multiplayer hub'e!

**Have fun!** 🎮✨
