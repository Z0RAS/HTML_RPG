import { login, register, getCharacters } from "./api.js";
import { canvas, ctx, drawPixelButton, drawPixelInput, drawPixelText, backgroundAnimated, titleImage } from "./renderer.js";
import { characterUI } from "./characterCreationUI.js";
import { openCharacterSelect } from "./characterSelectUI.js";
import { unlockAudio, playSound } from "./audio.js";

// Jei varnėlė nežymėta, iškart išvalome rememberedUsername
let remembered = localStorage.getItem("rememberedUsername");
if (!remembered) {
    localStorage.removeItem("rememberedUsername");
}

export let loginUI = {
    active: true,
    mode: "login",
    username: remembered || "",
    password: "",
    repeatPassword: "",
    focus: "username",
    message: "",
    bgAnimFrame: 0,
    bgAnimTimer: 0,
    bgAnimSpeed: 0.08,
    remember: remembered ? true : false
};

// Klaviatūra
window.addEventListener("keydown", (e) => {
    if (!loginUI.active) return;
    if (characterUI.active) return;
    

    if (e.key === "Tab") {
        if (loginUI.mode === "login") {
            loginUI.focus = loginUI.focus === "username" ? "password" : "username";
        } else {
            if (loginUI.focus === "username") loginUI.focus = "password";
            else if (loginUI.focus === "password") loginUI.focus = "repeat";
            else loginUI.focus = "username";
        }
        e.preventDefault();
        return;
    }


    if (e.key === "Backspace") {
        if (loginUI.focus === "username") {
            loginUI.username = loginUI.username.slice(0, -1);
            localStorage.setItem("rememberedUsername", loginUI.username);
        }
        else if (loginUI.focus === "password") loginUI.password = loginUI.password.slice(0, -1);
        else if (loginUI.focus === "repeat") loginUI.repeatPassword = loginUI.repeatPassword.slice(0, -1);
        return;
    }

    if (e.key === "Enter") {
        if (loginUI.mode === "login") doLogin();
        else doRegister();
        return;
    }

    if (e.key.length === 1) {
        if (loginUI.focus === "username") {
            loginUI.username += e.key;
            localStorage.setItem("rememberedUsername", loginUI.username);
        }
        else if (loginUI.focus === "password") loginUI.password += e.key;
        else if (loginUI.focus === "repeat") loginUI.repeatPassword += e.key;
    }
});

// Pelė
window.addEventListener("mousedown", (e) => {
    if (!loginUI.active) return;
    if (characterUI.active) return; // jeigu kuriam character, login nebegaudo
    
    // Unlock audio on first user interaction
    unlockAudio();

    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;


    // Username field (Y: 300, height: 40)
    if (mx > canvas.width/2 - 150 && mx < canvas.width/2 + 150 &&
        my > 300 && my < 340) {
        loginUI.focus = "username";
    }

    // Password field (Y: 390, height: 40)
    if (mx > canvas.width/2 - 150 && mx < canvas.width/2 + 150 &&
        my > 390 && my < 430) {
        loginUI.focus = "password";
    }

    // Repeat password field (only in register mode) (Y: 480, height: 40)
    if (loginUI.mode === "register") {
        if (mx > canvas.width/2 - 150 && mx < canvas.width/2 + 150 &&
            my > 480 && my < 520) {
            loginUI.focus = "repeat";
        }
    }

    if (loginUI.mode === "login" &&
        mx > canvas.width/2 - 150 && mx < canvas.width/2 - 120 &&
        my > 450 && my < 480) {
        loginUI.remember = !loginUI.remember;
        if (!loginUI.remember) localStorage.removeItem("rememberedUsername");
        else localStorage.setItem("rememberedUsername", loginUI.username);
    }

    // LOGIN MODE BUTTONS
    if (loginUI.mode === "login") {
        if (mx > canvas.width/2 - 150 && mx < canvas.width/2 + 150 &&
            my > 500 && my < 550) {
            playSound("button");
            doLogin();
        }

        // Switch to register (Y: 560, height: 40)
        if (mx > canvas.width/2 - 150 && mx < canvas.width/2 + 150 &&
            my > 560 && my < 600) {
            playSound("button");
            loginUI.mode = "register";
            loginUI.username = "";
            if (loginUI.remember) localStorage.setItem("rememberedUsername", "");
            loginUI.password = "";
            loginUI.repeatPassword = "";
            loginUI.message = "";
        }
    }

    // REGISTER MODE BUTTONS
    if (loginUI.mode === "register") {
        // Register button (Y: 580, height: 50)
        if (mx > canvas.width/2 - 150 && mx < canvas.width/2 + 150 &&
            my > 580 && my < 630) {
            playSound("button");
            doRegister();
        }

        // Back to login
        if (mx > canvas.width/2 - 150 && mx < canvas.width/2 + 150 &&
            my > 640 && my < 680) {
            playSound("button");
            loginUI.mode = "login";
            loginUI.message = "";
            if (!loginUI.remember) {
                loginUI.username = "";
                loginUI.password = "";
                loginUI.repeatPassword = "";
                loginUI.focus = "username";
                localStorage.removeItem("rememberedUsername");
            } else {
                // Jei varnėlė pažymėta, bet localStorage tuščias, atnaujinti
                localStorage.setItem("rememberedUsername", loginUI.username);
            }
        }
    }
});

// LOGIN
export async function doLogin() {
    const res = await login(loginUI.username, loginUI.password);

    if (!res.success) {
        loginUI.message = "Neteisingi duomenys";
        return;
    }

    const chars = await getCharacters(res.userId);

    loginUI.active = false;

    if (chars.length === 0) {
        characterUI.active = true;
        characterUI.userId = res.userId;
        characterUI.name = "";
        return;
    }

    openCharacterSelect(res.userId);
}

// REGISTER
export async function doRegister() {
    if (loginUI.password.length < 3) {
        loginUI.message = "Slaptažodis per trumpas";
        return;
    }

    if (loginUI.password !== loginUI.repeatPassword) {
        loginUI.message = "Slaptažodžiai nesutampa";
        return;
    }

    const res = await register(loginUI.username, loginUI.password);

    if (!res.success) {
        loginUI.message = res.error || "Registracija nepavyko";
        return;
    }

    loginUI.active = false;
    characterUI.active = true;
    characterUI.userId = res.userId;
    characterUI.name = "";
}

// Update animation
export function updateLoginUI(dt) {
    if (!loginUI.active) return;
    
    // Update background animation (8 frames total: 5 columns x 2 rows, last 2 empty)
    loginUI.bgAnimTimer += dt;
    if (loginUI.bgAnimTimer >= loginUI.bgAnimSpeed) {
        loginUI.bgAnimTimer = 0;
        loginUI.bgAnimFrame = (loginUI.bgAnimFrame + 1) % 8;
    }
}

// PIEŠIMAS
export function drawLoginUI() {
    // Jei loginUI tapo aktyvus ir varnėlė nepažymėta, išvalyti laukus ir localStorage
    if (loginUI.active && !loginUI._wasActive) {
        if (!loginUI.remember) {
            loginUI.username = "";
            loginUI.password = "";
            loginUI.repeatPassword = "";
            loginUI.focus = "username";
            localStorage.removeItem("rememberedUsername");
        }
    }
    loginUI._wasActive = loginUI.active;
    if (!loginUI.active) return;

    // Animated background
    if (backgroundAnimated && backgroundAnimated.complete) {
        // Background sprite: 5 columns × 2 rows (2800x544, each frame 560x272)
        const frameWidth = 560;
        const frameHeight = 272;
        const cols = 5;
        const frame = loginUI.bgAnimFrame || 0;
        const col = frame % cols;
        const row = Math.floor(frame / cols);
        const sx = col * frameWidth;
        const sy = row * frameHeight;
        
        // Scale to fit canvas while maintaining aspect ratio
        const scaleX = canvas.width / frameWidth;
        const scaleY = canvas.height / frameHeight;
        const scale = Math.max(scaleX, scaleY);
        const displayWidth = frameWidth * scale;
        const displayHeight = frameHeight * scale;
        const offsetX = (canvas.width - displayWidth) / 2;
        const offsetY = (canvas.height - displayHeight) / 2;
        
        ctx.drawImage(
            backgroundAnimated,
            sx, sy, frameWidth, frameHeight,
            offsetX, offsetY, displayWidth, displayHeight
        );
        
        // Dark overlay for readability
        ctx.fillStyle = "rgba(0,0,0,0.4)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
        // Fallback to dark overlay
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Game title image
    if (titleImage && titleImage.complete) {
        const titleWidth = 400;
        const titleHeight = (titleImage.height / titleImage.width) * titleWidth;
        ctx.drawImage(
            titleImage,
            canvas.width / 2 - titleWidth / 2,
            40,
            titleWidth,
            titleHeight
        );
    }

    // Game tagline with keywords
    drawPixelText("Dungeon Crawler - 2D Pixel RPG • Browser RPG • Bullet Hell", canvas.width / 2 - 170, 200, 12, "#ffd700");


    // Username label and input
    drawPixelText("Vartotojas:", canvas.width / 2 - 150, 280, 16, "#fff");
    drawPixelInput(
        canvas.width / 2 - 150, 
        300, 
        300, 
        40, 
        loginUI.username, 
        loginUI.focus === "username"
    );

    // Password label and input
    drawPixelText("Slaptažodis:", canvas.width / 2 - 150, 370, 16, "#fff");
    drawPixelInput(
        canvas.width / 2 - 150, 
        390, 
        300, 
        40, 
        "*".repeat(loginUI.password.length), 
        loginUI.focus === "password"
    );

    // Remember me checkbox
        if (loginUI.mode === "login") {
            ctx.globalAlpha = 1.0; // užtikrinam nepermatomumą
            ctx.fillStyle = "#fff";
            ctx.font = "14px monospace";
            ctx.fillText("Įsiminti mane", canvas.width/2 - 100, 470);
            ctx.strokeStyle = "#fff";
            ctx.lineWidth = 2;
            ctx.strokeRect(canvas.width/2 - 150, 450, 30, 30);
            ctx.lineWidth = 1;
            if (loginUI.remember) {
                ctx.globalAlpha = 1.0; // dar kartą užtikrinam nepermatomumą
                ctx.beginPath();
                ctx.moveTo(canvas.width/2 - 145, 470);
                ctx.lineTo(canvas.width/2 - 135, 475);
                ctx.lineTo(canvas.width/2 - 125, 455);
                ctx.strokeStyle = "#2ecc71";
                ctx.lineWidth = 3;
                ctx.stroke();
                ctx.strokeStyle = "#fff"; // grąžinam pradinę spalvą
                ctx.lineWidth = 1;
            }
        }

    // Repeat password (only in register mode)
    if (loginUI.mode === "register") {
        drawPixelText("Pakartokite:", canvas.width / 2 - 150, 460, 16, "#fff");
        drawPixelInput(
            canvas.width / 2 - 150, 
            480, 
            300, 
            40, 
            "*".repeat(loginUI.repeatPassword.length), 
            loginUI.focus === "repeat"
        );
    }


    // Main action button
    drawPixelButton(
        canvas.width / 2 - 150,
        loginUI.mode === "login" ? 500 : 580,
        300,
        50,
        loginUI.mode === "login" ? "PRISIJUNGTI" : "SUKURTI PASKYRĄ",
        "#2ecc71",
        "#27ae60"
    );

    // Secondary button 
    drawPixelButton(
        canvas.width / 2 - 150,
        loginUI.mode === "login" ? 560 : 640,
        300,
        40,
        loginUI.mode === "login" ? "SUKURTI PASKYRĄ" : "ATGAL Į PRISIJUNGIMĄ",
        "#34495e",
        "#2c3e50"
    );

    // Error message (po mygtukais)
    if (loginUI.message) {
        drawPixelText(loginUI.message, canvas.width / 2 - 150, loginUI.mode === "login" ? 610 : 690, 14, "#e74c3c");
    }
}
