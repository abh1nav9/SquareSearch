import StorageService from "../utils/storage.js";
import { DEFAULT_SETTINGS } from "../config/modelClient.js";
import { DEFAULT_SHORTCUTS, SHORTCUT_OS_KEYS } from "../config/shortcuts.js";

class OptionsPageController {
  constructor() {
    this.form = null;
    this.apiKeyInput = null;
    this.modelInput = null;
    this.shortcutInputs = {};
    this.statusNode = null;
    document.addEventListener("DOMContentLoaded", () => this.init());
  }

  async init() {
    this.cacheDom();
    this.bindEvents();
    await this.loadSettings();
  }

  cacheDom() {
    this.form = document.getElementById("settingsForm");
    this.apiKeyInput = document.getElementById("geminiKey");
    this.modelInput = document.getElementById("geminiModel");
    this.statusNode = document.getElementById("statusText");
    this.shortcutInputs = {
      mac: document.getElementById("shortcutMac"),
      windows: document.getElementById("shortcutWindows"),
      linux: document.getElementById("shortcutLinux"),
    };
  }

  bindEvents() {
    this.form.addEventListener("submit", (event) => {
      event.preventDefault();
      this.saveSettings();
    });
    document
      .getElementById("resetButton")
      .addEventListener("click", () => this.resetSettings());
  }

  async loadSettings() {
    const stored = (await StorageService.getSync("modelSettings")) || {
      ...DEFAULT_SETTINGS,
    };
    const shortcutSettings = (await StorageService.getSync(
      "shortcutSettings"
    )) || {
      ...DEFAULT_SHORTCUTS,
    };
    this.apiKeyInput.value = stored.apiKey || "";
    this.modelInput.value = stored.model || DEFAULT_SETTINGS.model;
    SHORTCUT_OS_KEYS.forEach((key) => {
      if (this.shortcutInputs[key]) {
        this.shortcutInputs[key].value =
          shortcutSettings[key] || DEFAULT_SHORTCUTS[key];
      }
    });
    this.setStatus("Settings loaded.");
  }

  async saveSettings() {
    const apiKey = this.apiKeyInput.value.trim();
    if (!apiKey) {
      this.setStatus("Please provide your Gemini API key.");
      return;
    }
    const payload = {
      apiKey,
      model: this.modelInput.value.trim() || DEFAULT_SETTINGS.model,
    };
    const shortcutPayload = this.buildShortcutPayload();
    await Promise.all([
      StorageService.setSync("modelSettings", payload),
      StorageService.setSync("shortcutSettings", shortcutPayload),
    ]);
    this.setStatus("Settings saved.");
  }

  async resetSettings() {
    await Promise.all([
      StorageService.setSync("modelSettings", { ...DEFAULT_SETTINGS }),
      StorageService.setSync("shortcutSettings", { ...DEFAULT_SHORTCUTS }),
    ]);
    await this.loadSettings();
    this.setStatus("Defaults restored.");
  }

  buildShortcutPayload() {
    const payload = { ...DEFAULT_SHORTCUTS };
    SHORTCUT_OS_KEYS.forEach((key) => {
      const field = this.shortcutInputs[key];
      if (field) {
        payload[key] = this.normalizeShortcut(
          field.value,
          DEFAULT_SHORTCUTS[key]
        );
      }
    });
    return payload;
  }

  normalizeShortcut(value, fallback) {
    const parts = value
      .split("+")
      .map((segment) => segment.trim())
      .filter(Boolean);
    if (!parts.length) {
      return fallback;
    }
    const modifiers = [];
    let keyPart = null;
    parts.forEach((part) => {
      const lower = part.toLowerCase();
      if (lower === "ctrl" || lower === "control") {
        if (!modifiers.includes("Ctrl")) {
          modifiers.push("Ctrl");
        }
      } else if (lower === "shift") {
        if (!modifiers.includes("Shift")) {
          modifiers.push("Shift");
        }
      } else if (lower === "alt" || lower === "option") {
        if (!modifiers.includes("Alt")) {
          modifiers.push("Alt");
        }
      } else if (lower === "command" || lower === "cmd" || lower === "meta") {
        if (!modifiers.includes("Command")) {
          modifiers.push("Command");
        }
      } else if (!keyPart) {
        keyPart = part.length === 1 ? part.toUpperCase() : part;
      }
    });
    if (!keyPart) {
      return fallback;
    }
    return [...modifiers, keyPart].join("+");
  }

  setStatus(message) {
    this.statusNode.textContent = message;
  }
}

new OptionsPageController();
