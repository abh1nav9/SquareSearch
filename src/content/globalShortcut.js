const shortcutModulePromise = import(
  chrome.runtime.getURL("src/config/shortcuts.js")
);

let DEFAULT_SHORTCUTS = {
  mac: "Command+Shift+S",
  windows: "Ctrl+Shift+S",
  linux: "Ctrl+Shift+S",
};

let platformKey = "windows";
let activeShortcut = null;
let shortcutShape = null;

const isEditableTarget = (target) => {
  if (!target) {
    return false;
  }
  const tag = target.tagName?.toLowerCase();
  if (tag === "input" || tag === "textarea") {
    return true;
  }
  return target.isContentEditable;
};

const normalizeKey = (key) => key?.toLowerCase();

const parseShortcut = (shortcut) => {
  if (!shortcut) {
    return null;
  }
  const parts = shortcut
    .split("+")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
  const shape = {
    ctrl: false,
    shift: false,
    alt: false,
    meta: false,
    key: null,
  };
  parts.forEach((part) => {
    if (part === "ctrl" || part === "control" || part === "cmdorctrl") {
      shape.ctrl = true;
    } else if (part === "shift") {
      shape.shift = true;
    } else if (part === "alt" || part === "option") {
      shape.alt = true;
    } else if (
      part === "meta" ||
      part === "command" ||
      part === "cmd" ||
      part === "super"
    ) {
      shape.meta = true;
    } else {
      shape.key = part;
    }
  });
  return shape.key ? shape : null;
};

const matchesShortcut = (event, shape) => {
  if (!shape) {
    return false;
  }
  if (!!shape.ctrl !== event.ctrlKey) {
    return false;
  }
  if (!!shape.shift !== event.shiftKey) {
    return false;
  }
  if (!!shape.alt !== event.altKey) {
    return false;
  }
  if (!!shape.meta !== event.metaKey) {
    return false;
  }
  const eventKey = normalizeKey(event.key);
  return shape.key === eventKey;
};

const detectPlatformKey = () => {
  const platform =
    navigator.userAgentData?.platform || navigator.platform || "";
  const normalized = platform.toLowerCase();
  if (normalized.includes("mac")) {
    return "mac";
  }
  if (normalized.includes("win")) {
    return "windows";
  }
  return "linux";
};

const applyShortcutSettings = (settings) => {
  const config = { ...DEFAULT_SHORTCUTS, ...(settings || {}) };
  activeShortcut = config[platformKey] || config.windows || config.mac;
  shortcutShape = parseShortcut(activeShortcut);
};

const loadShortcuts = async () => {
  const result = await chrome.storage.sync.get("shortcutSettings");
  applyShortcutSettings(result?.shortcutSettings);
};

const init = async () => {
  try {
    const module = await shortcutModulePromise;
    DEFAULT_SHORTCUTS = module.DEFAULT_SHORTCUTS || DEFAULT_SHORTCUTS;
  } catch (error) {
    console.warn("Square Search: failed to load shortcut defaults.", error);
  }
  platformKey = detectPlatformKey();
  await loadShortcuts();

  document.addEventListener(
    "keydown",
    (event) => {
      if (event.repeat || isEditableTarget(event.target)) {
        return;
      }
      if (matchesShortcut(event, shortcutShape)) {
        const selection =
          window.getSelection && window.getSelection().toString();
        chrome.runtime.sendMessage({
          type: "SQUARE_SEARCH_TRIGGER",
          payload: {
            selectionText: selection ? selection.trim() : "",
          },
        });
        event.preventDefault();
      }
    },
    true
  );

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "sync" && changes.shortcutSettings) {
      applyShortcutSettings(changes.shortcutSettings.newValue);
    }
  });
};

init().catch((error) => {
  console.error("Square Search: failed to initialize shortcuts", error);
});
