import { drawRect, drawPixelText, ctx, canvas } from "./renderer.js";
import { playerStats } from "./stats.js";
import { ultimateSkills } from "./skills.js";

export let classMergeUI = {
    isOpen: false,
    selectedMergeClass: null
};

const availableMerges = {
    warrior: [
        { class: "mage", name: "Battle Mage", nameLT: "Kovų Magas", icon: "🔥⚔️", ultimate: "Elemental Fury" },
        { class: "tank", name: "Berserker", nameLT: "Berserkeris", icon: "💪🛡️", ultimate: "Unstoppable Force" }
    ],
    mage: [
        { class: "warrior", name: "Spellblade", nameLT: "Kalvijo kerėtojas", icon: "⚔️✨", ultimate: "Arcane Slash" },
        { class: "tank", name: "Mystic Guardian", nameLT: "Mistinis Sargas", icon: "🛡️🔮", ultimate: "Protective Dome" }
    ],
    tank: [
        { class: "warrior", name: "Juggernaut", nameLT: "Jugernautas", icon: "⚔️💥", ultimate: "Ground Slam" },
        { class: "mage", name: "Paladin", nameLT: "Paladinas", icon: "✨🛡️", ultimate: "Divine Intervention" }
    ]
};

export function openClassMergeUI() {
    classMergeUI.isOpen = true;
    classMergeUI.selectedMergeClass = null;
}

export function closeClassMergeUI() {
    classMergeUI.isOpen = false;
}

export function drawClassMergeUI() {
    if (!classMergeUI.isOpen) return;
    
    const playerClass = playerStats.class || "warrior";
    const merges = availableMerges[playerClass] || [];
    
    // Dark overlay
    ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Main panel simplified
    const panelWidth = 710;
    const panelHeight = 430;
    const panelX = (canvas.width - panelWidth) / 2;
    const panelY = (canvas.height - panelHeight) / 2;

    drawRect(panelX, panelY, panelWidth, panelHeight, "#1f1f1f");
    drawRect(panelX, panelY, panelWidth, 2, "#555");
    drawRect(panelX, panelY, 2, panelHeight, "#555");
    drawRect(panelX + panelWidth - 2, panelY, 2, panelHeight, "#555");
    drawRect(panelX, panelY + panelHeight - 2, panelWidth, 2, "#555");

    // Title and subtitle
    drawPixelText("Klasės sujungimas (Lygis 10)", panelX + 20, panelY + 20, 18, "#ffd700");
    drawPixelText("Pasirink junginį ir atrakink sugebėjimą", panelX + 20, panelY + 44, 12, "#bbb");

    const classIcons = { warrior: "⚔️", mage: "🔮", tank: "🛡️" };
    const classNames = { warrior: "Karys", mage: "Magas", tank: "Tankas" };
    drawPixelText(`Jūsų klasė: ${classIcons[playerClass]} ${classNames[playerClass]}`, panelX + 20, panelY + 70, 14, "#fff");

    const optionStartY = panelY + 115;
    const optionHeight = 80;
    const optionGap = 14;

    for (let i = 0; i < merges.length; i++) {
        const merge = merges[i];
        const optionY = optionStartY + (i * (optionHeight + optionGap));
        const isSelected = classMergeUI.selectedMergeClass === merge.class;
        const ultimateLT = (ultimateSkills[merge.ultimate]?.nameLT) || merge.ultimate;

        drawRect(panelX + 20, optionY, panelWidth - 40, optionHeight, isSelected ? "#2f4f2f" : "#2b2b2b");
        drawRect(panelX + 20, optionY, panelWidth - 40, 2, isSelected ? "#6f6" : "#444");
        drawRect(panelX + 20, optionY + optionHeight - 2, panelWidth - 40, 2, isSelected ? "#6f6" : "#444");

        if (isSelected) {
            // Thin indicator bar on the left when selected
            drawRect(panelX + 22, optionY + 4, 4, optionHeight - 8, "#6f6");
        }

        ctx.font = "30px monospace";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#fff";
        ctx.fillText(`${classNames[playerClass]} + ${classNames[merge.class]} = ${merge.nameLT}`, panelX + 35, optionY + optionHeight / 2 - 12);

        drawPixelText(`Gebėjimas: ${ultimateLT} ${merge.icon}`, panelX + 35, optionY + optionHeight / 2 + 8, 12, "#ffd700");

        if (isSelected) {
            drawPixelText("Pasirinkta", panelX + panelWidth - 120, optionY + optionHeight / 2 + 8, 12, "#6f6");
        }
    }

    // Confirm button
    const buttonWidth = 200;
    const buttonHeight = 36;
    const buttonX = panelX + panelWidth - buttonWidth - 20;
    const buttonY = panelY + panelHeight - buttonHeight - 18;
    const canConfirm = !!classMergeUI.selectedMergeClass;

    drawRect(buttonX, buttonY, buttonWidth, buttonHeight, canConfirm ? "#2d5f2d" : "#333");
    drawRect(buttonX, buttonY, buttonWidth, 2, canConfirm ? "#6f6" : "#444");
    drawRect(buttonX, buttonY + buttonHeight - 2, buttonWidth, 2, canConfirm ? "#6f6" : "#444");
    drawPixelText(canConfirm ? "Patvirtinti pasirinkimą" : "Pasirink junginį", buttonX + 14, buttonY + 12, 12, canConfirm ? "#d8ffd8" : "#888");

    drawPixelText("Pasirink junginį ir spausk patvirtinti", panelX + 20, panelY + panelHeight - 35, 12, "#aaa");
}

export function handleClassMergeClick(mouseX, mouseY) {
    if (!classMergeUI.isOpen) return null;
    
    const playerClass = playerStats.class || "warrior";
    const merges = availableMerges[playerClass] || [];
    
    const panelWidth = 710;
    const panelHeight = 430;
    const panelX = (canvas.width - panelWidth) / 2;
    const panelY = (canvas.height - panelHeight) / 2;
    
    const optionStartY = panelY + 115;
    const optionHeight = 80;
    const optionGap = 14;

    const buttonWidth = 200;
    const buttonHeight = 36;
    const buttonX = panelX + panelWidth - buttonWidth - 20;
    const buttonY = panelY + panelHeight - buttonHeight - 18;
    
    // Check merge option clicks
    for (let i = 0; i < merges.length; i++) {
            const merge = merges[i];
            const optionY = optionStartY + (i * (optionHeight + optionGap));
            
            if (mouseX >= panelX + 20 && mouseX <= panelX + panelWidth - 20 &&
                mouseY >= optionY && mouseY <= optionY + optionHeight) {
                classMergeUI.selectedMergeClass = merge.class;
                return null;
            }
    }

    // Confirm button click
    if (mouseX >= buttonX && mouseX <= buttonX + buttonWidth &&
        mouseY >= buttonY && mouseY <= buttonY + buttonHeight) {
        if (classMergeUI.selectedMergeClass) {
            const selectedMerge = merges.find(m => m.class === classMergeUI.selectedMergeClass);
            closeClassMergeUI();
            return selectedMerge;
        }
    }
    return null;
}

export function getMergeInfo(playerClass, mergeClass) {
    const merges = availableMerges[playerClass] || [];
    return merges.find(m => m.class === mergeClass);
}
