// Audio manager for game sounds and music
const sounds = {};
const music = {};
let currentMusic = null;
let musicVolume = 0.3;
let sfxVolume = 0.5;
let isMuted = false;
let audioUnlocked = false; // Track if user has interacted with the page
let pendingMusic = null; // Store music to play after unlock

// Load all audio files
export function loadAudio() {
    // Sound effects
    sounds.attack = new Audio("./src/assets/SFX/Attack.mp3");
    sounds.death = new Audio("./src/assets/SFX/Death.mp3");
    sounds.enemyDeath = new Audio("./src/assets/SFX/EnemyDeath.mp3");
    sounds.pickup = new Audio("./src/assets/SFX/PickUp.mp3");
    sounds.levelUp = new Audio("./src/assets/SFX/LevelUp.mp3");
    sounds.grassWalk = new Audio("./src/assets/SFX/GrassWalk.mp3");
    sounds.caveWalk = new Audio("./src/assets/SFX/CaveWalk.mp3");
    sounds.itemInteract = new Audio("./src/assets/SFX/ItemInteract.mp3");
    sounds.purchase = new Audio("./src/assets/SFX/Purchase.mp3");
    sounds.sell = new Audio("./src/assets/SFX/Sell.mp3");
    sounds.portalActivation = new Audio("./src/assets/SFX/PortalActivation.mp3");
    sounds.button = new Audio("./src/assets/SFX/Buttons.mp3");
    sounds.skill1 = new Audio("./src/assets/SFX/Skill1.mp3");
    sounds.skill2 = new Audio("./src/assets/SFX/Skill2.mp3");
    sounds.skill3 = new Audio("./src/assets/SFX/Skill3.mp3");
    sounds.ultimate = new Audio("./src/assets/SFX/Ultimate.mp3");
    
    // Background music
    music.login = new Audio("./src/assets/SFX/LoginTheme.mp3");
    music.hub = new Audio("./src/assets/SFX/HubSong.mp3");
    music.dungeon = new Audio("./src/assets/SFX/DungeonSong.mp3");
    
    // Set volumes for all sounds
    Object.values(sounds).forEach(sound => {
        sound.volume = sfxVolume;
    });
    
    // Set music to loop and set volume
    Object.values(music).forEach(track => {
        track.loop = true;
        track.volume = musicVolume;
    });
    
    console.log("Audio loaded successfully");
}

// Play a sound effect
export function playSound(soundName) {
    if (isMuted || !sounds[soundName]) return;
    
    try {
        // Clone the audio to allow overlapping sounds
        const sound = sounds[soundName].cloneNode();
        sound.volume = sfxVolume;
        sound.play().catch(err => console.warn(`Could not play sound ${soundName}:`, err));
    } catch (err) {
        console.warn(`Error playing sound ${soundName}:`, err);
    }
}

// Play background music
export function playMusic(musicName) {
    if (isMuted) return;
    
    // If audio hasn't been unlocked yet, store it as pending
    if (!audioUnlocked) {
        pendingMusic = musicName;
        return;
    }
    
    // Stop current music if playing
    if (currentMusic) {
        currentMusic.pause();
        currentMusic.currentTime = 0;
    }
    
    // Start new music
    if (music[musicName]) {
        currentMusic = music[musicName];
        currentMusic.volume = musicVolume;
        currentMusic.play().catch(err => console.warn(`Could not play music ${musicName}:`, err));
    }
}

// Stop all music
export function stopMusic() {
    if (currentMusic) {
        currentMusic.pause();
        currentMusic.currentTime = 0;
        currentMusic = null;
    }
}

// Set music volume (0.0 to 1.0)
export function setMusicVolume(volume) {
    musicVolume = Math.max(0, Math.min(1, volume));
    if (currentMusic) {
        currentMusic.volume = musicVolume;
    }
    Object.values(music).forEach(track => {
        track.volume = musicVolume;
    });
}

// Set sound effects volume (0.0 to 1.0)
export function setSFXVolume(volume) {
    sfxVolume = Math.max(0, Math.min(1, volume));
    Object.values(sounds).forEach(sound => {
        sound.volume = sfxVolume;
    });
}

// Toggle mute
export function toggleMute() {
    isMuted = !isMuted;
    if (isMuted) {
        if (currentMusic) {
            currentMusic.pause();
        }
    } else {
        if (currentMusic) {
            currentMusic.play().catch(err => console.warn("Could not resume music:", err));
        }
    }
    return isMuted;
}

// Get mute state
export function getMuted() {
    return isMuted;
}

// Play looping walk sound
let walkSound = null;
let currentWalkSoundType = null;
export function playWalkSound(scene = "hub") {
    if (isMuted || !audioUnlocked) return;
    
    // Determine which walk sound to use based on scene
    const soundType = scene === "dungeon" ? "caveWalk" : "grassWalk";
    
    // If already playing the correct sound, don't restart
    if (walkSound && !walkSound.paused && currentWalkSoundType === soundType) {
        return;
    }
    
    // Stop current walk sound if playing wrong type
    if (walkSound && !walkSound.paused && currentWalkSoundType !== soundType) {
        walkSound.pause();
        walkSound.currentTime = 0;
    }
    
    // Start new walk sound
    walkSound = sounds[soundType].cloneNode();
    walkSound.loop = true;
    walkSound.volume = sfxVolume * 0.3; // Lower volume for walk
    walkSound.play().catch(err => console.warn("Could not play walk sound:", err));
    currentWalkSoundType = soundType;
}

// Stop walk sound
export function stopWalkSound() {
    if (walkSound && !walkSound.paused) {
        walkSound.pause();
        walkSound.currentTime = 0;
        walkSound = null;
        currentWalkSoundType = null;
    }
}

// Unlock audio after user interaction
export function unlockAudio() {
    if (audioUnlocked) return;
    
    audioUnlocked = true;
    console.log("Audio unlocked");
    
    // Play pending music if any
    if (pendingMusic) {
        playMusic(pendingMusic);
        pendingMusic = null;
    }
}
