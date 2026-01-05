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
PORT=3000
```

If not set, a default key will be used (change in production).

## Deployment to Render.com

### Quick Deploy

1. **Push to GitHub** (already done!)

2. **Create Render Account**
   - Go to https://render.com and sign up
   - Connect your GitHub account

3. **Create New Web Service**
   - Click "New +" → "Web Service"
   - Connect your `HTML_RPG` repository
   - Configure:
     - **Name**: `html-rpg` (or your choice)
     - **Region**: Choose closest to you
     - **Branch**: `main`
     - **Root Directory**: leave empty
     - **Runtime**: `Node`
     - **Build Command**: `cd server && npm install`
     - **Start Command**: `cd server && node server.js`
     - **Instance Type**: Free

4. **Add Environment Variable**
   - In the "Environment" section, add:
     - Key: `JWT_SECRET`
     - Value: Click "Generate" for a secure random value

5. **Deploy**
   - Click "Create Web Service"
   - Wait 2-3 minutes for deployment
   - Your app will be live at: `https://html-rpg.onrender.com` (or your chosen name)

### Alternative: Using render.yaml

This repo includes a `render.yaml` file for automatic configuration:

1. Go to Render Dashboard
2. Click "New +" → "Blueprint"
3. Select your `HTML_RPG` repository
4. Render will automatically read `render.yaml` and configure everything

### Important Notes

- The free tier spins down after 15 minutes of inactivity
- First request after spin-down may take 30-60 seconds
- Database is SQLite (stored in the container, will reset on redeploy)
- For production, consider upgrading to paid tier with persistent storage

### Troubleshooting

If deployment fails:
- Check logs in Render dashboard
- Ensure `server/package.json` has all dependencies
- Verify Node version compatibility (v14+)

## License

MIT
