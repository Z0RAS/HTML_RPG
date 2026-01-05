# Dungeon Crawler Game

A browser-based dungeon crawler RPG built with vanilla JavaScript and Node.js.

## Features

- **Character System**: Create characters with different classes (Warrior, Mage, Tank)
- **Dungeon Exploration**: Procedurally generated dungeons with enemies and loot
- **Combat System**: Real-time combat with skills and abilities
- **Inventory & Equipment**: Manage items and equip gear
- **Skill Tree**: Customize your character with skill points
- **Shop System**: Buy and sell items
- **JWT Authentication**: Secure user authentication and authorization

## Tech Stack

### Frontend
- Vanilla JavaScript (ES6 modules)
- HTML5 Canvas for rendering
- LocalStorage for token persistence

### Backend
- Node.js with Express
- SQLite database
- JWT authentication
- bcrypt for password hashing

## Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd Dungeon_crawler
```

2. Install server dependencies:
```bash
cd server
npm install
```

3. Start the server:
```bash
node server.js
```

4. Open `index.html` in your browser or visit `http://localhost:3000`

## Project Structure

```
Dungeon_crawler/
├── index.html          # Main HTML file
├── server/             # Backend server
│   ├── server.js       # Express server with JWT auth
│   ├── loot.js         # Loot generation system
│   ├── stats.js        # Character stats calculation
│   ├── storage.js      # Database operations
│   ├── schema.sql      # Database schema
│   └── package.json    # Server dependencies
└── src/                # Frontend source code
    ├── api.js          # API client with JWT token management
    ├── main.js         # Main game loop
    ├── engine.js       # Game engine
    ├── renderer.js     # Canvas rendering
    ├── player.js       # Player character
    ├── enemies.js      # Enemy system
    ├── dungeon.js      # Dungeon generation
    ├── inventory.js    # Inventory system
    ├── skillTree.js    # Skill tree system
    ├── shop.js         # Shop system
    ├── loginUI.js      # Login/register UI
    └── ...             # Other game modules
```

## Security

- JWT tokens with 24-hour expiration
- Password hashing with bcrypt
- Authorization checks on all endpoints
- Input validation on client and server
- Users can only access their own data

## Environment Variables

Create a `.env` file in the server directory (optional):

```
JWT_SECRET=your-secret-key-here
```

If not set, a default key will be used (change in production).

## License

MIT
