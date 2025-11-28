export const SHORTCUT_OS_KEYS = ["mac", "windows", "linux"];

export const DEFAULT_SHORTCUTS = {
  mac: "Command+Shift+S",
  windows: "Ctrl+Shift+S",
  linux: "Ctrl+Shift+S",
};

export function detectPlatformKey() {
  const platform =
    (typeof navigator !== "undefined" &&
      (navigator.userAgentData?.platform || navigator.platform || "")) ||
    "";
  const normalized = platform.toLowerCase();
  if (normalized.includes("mac")) {
    return "mac";
  }
  if (normalized.includes("win")) {
    return "windows";
  }
  return "linux";
}
