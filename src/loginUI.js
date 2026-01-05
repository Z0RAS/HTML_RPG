import { login, register, getCharacters } from "./api.js";
import { canvas, ctx, drawPixelButton, drawPixelInput, drawPixelText } from "./renderer.js";
import { characterUI } from "./characterCreationUI.js";
import { openCharacterSelect } from "./characterSelectUI.js";

export let loginUI = {
    active: true,
    mode: "login",
    username: "",
    password: "",
    repeatPassword: "",
    focus: "username",
    message: ""
};

// Klaviatūra
window.addEventListener("keydown", (e) => {
    if (!loginUI.active) return;
    if (characterUI.active) return; // nesikišam, kai atidarytas character creation
    // charSelectUI ignoruojam, nes jis turi savo inputą (tik pelė)

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
        if (loginUI.focus === "username") loginUI.username = loginUI.username.slice(0, -1);
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
        if (loginUI.focus === "username") loginUI.username += e.key;
        else if (loginUI.focus === "password") loginUI.password += e.key;
        else if (loginUI.focus === "repeat") loginUI.repeatPassword += e.key;
    }
});

// Pelė
window.addEventListener("mousedown", (e) => {
    if (!loginUI.active) return;
    if (characterUI.active) return; // jeigu kuriam character, login nebegaudo

    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // Username field
    if (mx > canvas.width/2 - 150 && mx < canvas.width/2 + 150 &&
        my > 250 && my < 290) {
        loginUI.focus = "username";
    }

    // Password field
    if (mx > canvas.width/2 - 150 && mx < canvas.width/2 + 150 &&
        my > 340 && my < 380) {
        loginUI.focus = "password";
    }

    // Repeat password field (only in register mode)
    if (loginUI.mode === "register") {
        if (mx > canvas.width/2 - 150 && mx < canvas.width/2 + 150 &&
            my > 430 && my < 470) {
            loginUI.focus = "repeat";
        }
    }

    // LOGIN MODE BUTTONS
    if (loginUI.mode === "login") {
        // Login button
        if (mx > canvas.width/2 - 150 && mx < canvas.width/2 + 150 &&
            my > 420 && my < 470) {
            doLogin();
        }

        // Switch to register
        if (mx > canvas.width/2 - 150 && mx < canvas.width/2 + 150 &&
            my > 480 && my < 520) {
            loginUI.mode = "register";
            loginUI.username = "";
            loginUI.password = "";
            loginUI.repeatPassword = "";
            loginUI.message = "";
        }
    }

    // REGISTER MODE BUTTONS
    if (loginUI.mode === "register") {
        // Register button
        if (mx > canvas.width/2 - 150 && mx < canvas.width/2 + 150 &&
            my > 500 && my < 550) {
            doRegister();
        }

        // Back to login
        if (mx > canvas.width/2 - 150 && mx < canvas.width/2 + 150 &&
            my > 560 && my < 600) {
            loginUI.mode = "login";
            loginUI.message = "";
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

// PIEŠIMAS
export function drawLoginUI() {
    if (!loginUI.active) return;

    // Dark overlay
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Title
    drawPixelText(
        loginUI.mode === "login" ? "PRISIJUNGIMAS" : "REGISTRACIJA",
        canvas.width / 2 - 120,
        120,
        24,
        "#fff"
    );

    // Username label and input
    drawPixelText("Vartotojas:", canvas.width / 2 - 150, 230, 16, "#fff");
    drawPixelInput(
        canvas.width / 2 - 150, 
        250, 
        300, 
        40, 
        loginUI.username, 
        loginUI.focus === "username"
    );

    // Password label and input
    drawPixelText("Slaptažodis:", canvas.width / 2 - 150, 320, 16, "#fff");
    drawPixelInput(
        canvas.width / 2 - 150, 
        340, 
        300, 
        40, 
        "*".repeat(loginUI.password.length), 
        loginUI.focus === "password"
    );

    // Repeat password (only in register mode)
    if (loginUI.mode === "register") {
        drawPixelText("Pakartokite:", canvas.width / 2 - 150, 410, 16, "#fff");
        drawPixelInput(
            canvas.width / 2 - 150, 
            430, 
            300, 
            40, 
            "*".repeat(loginUI.repeatPassword.length), 
            loginUI.focus === "repeat"
        );
    }

    // Main action button
    drawPixelButton(
        canvas.width / 2 - 150,
        loginUI.mode === "login" ? 420 : 500,
        300,
        50,
        loginUI.mode === "login" ? "PRISIJUNGTI" : "SUKURTI PASKYRĄ",
        "#2ecc71",
        "#27ae60"
    );

    // Secondary button
    drawPixelButton(
        canvas.width / 2 - 150,
        loginUI.mode === "login" ? 480 : 560,
        300,
        40,
        loginUI.mode === "login" ? "SUKURTI PASKYRĄ" : "ATGAL Į PRISIJUNGIMĄ",
        "#34495e",
        "#2c3e50"
    );

    // Error message
    if (loginUI.message) {
        drawPixelText(
            loginUI.message,
            canvas.width / 2 - 150,
            loginUI.mode === "login" ? 540 : 620,
            14,
            "#e74c3c"
        );
    }
}
