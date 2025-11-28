import StorageService from "./utils/storage.js";
import { DEFAULT_SHORTCUTS } from "./config/shortcuts.js";

class BackgroundController {
  constructor() {
    this.ensureShortcutDefaults().catch((error) =>
      console.warn("Shortcut defaults init failed", error)
    );
    chrome.action.onClicked.addListener((tab) =>
      this.handleActionClick(tab).catch((error) =>
        console.error("Action click failed", error)
      )
    );
    chrome.commands.onCommand.addListener((command) => {
      if (command === "square-search-start") {
        this.triggerFromActiveTab().catch((error) =>
          console.error("Shortcut trigger failed", error)
        );
      }
    });
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message?.type === "REGION_SELECTED") {
        this.onRegionSelected(message.payload, sender.tab)
          .then(() => sendResponse({ success: true }))
          .catch((error) => {
            console.error("Region handling failed", error);
            sendResponse({ success: false, error: error.message });
          });
        return true;
      }
      if (message?.type === "SQUARE_SEARCH_OPEN_TAB" && message.url) {
        chrome.tabs.create({ url: message.url }).then(
          () => sendResponse({ success: true }),
          (error) => {
            console.error("Failed to open tab", error);
            sendResponse({ success: false, error: error?.message });
          }
        );
        return true;
      }
      if (message?.type === "SQUARE_SEARCH_TRIGGER") {
        this.triggerFromActiveTab(
          sender?.tab,
          message?.payload?.selectionText
        )
          .then(() => sendResponse({ success: true }))
          .catch((error) => {
            console.error("Content shortcut failed", error);
            sendResponse({ success: false, error: error?.message });
          });
        return true;
      }
      if (message?.type === "SQUARE_SEARCH_GOOGLE_LENS") {
        this.startGoogleLensFlow(message.payload?.imageBase64)
          .then(() => sendResponse({ success: true }))
          .catch((error) => {
            console.error("Google Lens upload failed", error);
            sendResponse({ success: false, error: error?.message });
          });
        return true;
      }
      return false;
    });
  }

  async handleActionClick(tab) {
    if (!tab?.id) {
      console.error("No active tab to inject overlay.");
      return;
    }
    if (!this.isInjectableUrl(tab.url)) {
      console.warn("Overlay injection blocked on this URL.", tab.url);
      return;
    }
    await this.injectOverlayScript(tab.id);
    await this.sendPanelCommand(tab.id, {
      type: "SQUARE_SEARCH_START_CAPTURE",
    });
  }

  async injectOverlayScript(tabId) {
    try {
      await chrome.scripting.insertCSS({
        target: { tabId },
        files: ["src/content/overlay.css"],
      });
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ["src/content/overlay.js"],
      });
    } catch (error) {
      console.error("Failed to inject overlay", error);
    }
  }

  async onRegionSelected(regionPayload, tab) {
    if (!tab) {
      throw new Error("Missing tab for region selection.");
    }
    await this.captureAndNotify(regionPayload, tab);
  }

  async captureAndNotify(regionPayload, tab) {
    const screenshot = await this.captureVisibleTabImage(tab.windowId);
    await StorageService.setLocal("capturedImage", screenshot);
    await StorageService.setLocal("capturedRegion", regionPayload);
    await this.sendDisplayMessage(tab.id);
  }

  captureVisibleTabImage(windowId) {
    return new Promise((resolve, reject) => {
      chrome.tabs.captureVisibleTab(windowId, { format: "png" }, (dataUrl) => {
        if (chrome.runtime.lastError || !dataUrl) {
          reject(
            chrome.runtime.lastError ||
              new Error("Failed to capture visible tab.")
          );
          return;
        }
        resolve(dataUrl);
      });
    });
  }

  isInjectableUrl(url) {
    if (!url) {
      return false;
    }
    const blockedSchemes = [
      "chrome://",
      "chrome-extension://",
      "edge://",
      "about:",
      "view-source:",
    ];
    return !blockedSchemes.some((scheme) => url.startsWith(scheme));
  }

  async sendDisplayMessage(tabId) {
    try {
      await chrome.tabs.sendMessage(tabId, {
        type: "SQUARE_SEARCH_SHOW_RESULTS",
      });
    } catch (error) {
      console.warn("Unable to notify tab for results panel.", error);
    }
  }

  async startGoogleLensFlow(imageBase64) {
    if (!imageBase64) {
      throw new Error("Missing image data for Google Lens.");
    }
    const lensTab = await chrome.tabs.create({
      url: "https://lens.google.com/upload?ep=ccm&s=4",
    });
    await this.waitForTabReady(lensTab.id);
    await chrome.scripting.executeScript({
      target: { tabId: lensTab.id },
      world: "MAIN",
      args: [imageBase64],
      func: async (base64Image) => {
        if (!base64Image) {
          throw new Error("Square Search: Missing Lens payload.");
        }
        const binary = atob(base64Image);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i += 1) {
          bytes[i] = binary.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: "image/png" });
        const formData = new FormData();
        formData.append("encoded_image", blob, "square-search.png");
        formData.append("image_content", "");
        const response = await fetch("https://lens.google.com/upload", {
          method: "POST",
          body: formData,
          redirect: "follow",
          credentials: "include",
        });
        if (!response?.url) {
          throw new Error("Square Search: Lens response missing redirect URL.");
        }
        window.location.href = response.url;
      },
    });
  }

  waitForTabReady(tabId) {
    return new Promise((resolve, reject) => {
      const cleanup = () => {
        chrome.tabs.onUpdated.removeListener(handleUpdated);
        chrome.tabs.onRemoved.removeListener(handleRemoved);
      };
      const handleUpdated = (updatedTabId, info) => {
        if (updatedTabId === tabId && info.status === "complete") {
          cleanup();
          resolve();
        }
      };
      const handleRemoved = (removedTabId) => {
        if (removedTabId === tabId) {
          cleanup();
          reject(new Error("Google Lens tab was closed before upload."));
        }
      };
      chrome.tabs.onUpdated.addListener(handleUpdated);
      chrome.tabs.onRemoved.addListener(handleRemoved);
    });
  }

  async triggerFromActiveTab(senderTab, selectionText) {
    const tab =
      senderTab?.id && senderTab
        ? senderTab
        : await this.queryActiveTab();
    if (!tab?.id) {
      console.warn("Square Search: No active tab for shortcut trigger.");
      return;
    }
    let text = (selectionText || "").trim();
    if (!text && this.isInjectableUrl(tab.url)) {
      text = (await this.fetchSelectionText(tab.id)).trim();
    }
    if (text) {
      await this.startTextSearch(tab, text);
    } else {
      await this.handleActionClick(tab);
    }
  }

  async ensureShortcutDefaults() {
    const storedShortcuts = await StorageService.getSync("shortcutSettings");
    if (!storedShortcuts) {
      await StorageService.setSync("shortcutSettings", {
        ...DEFAULT_SHORTCUTS,
      });
    }
  }

  async startTextSearch(tab, text) {
    if (!tab?.id) {
      return;
    }
    if (!this.isInjectableUrl(tab.url)) {
      console.warn("Text search blocked on this URL.", tab.url);
      return;
    }
    await this.injectOverlayScript(tab.id);
    await this.sendPanelCommand(tab.id, {
      type: "SQUARE_SEARCH_TEXT_MODE",
      payload: { text },
    });
  }

  async sendPanelCommand(tabId, message, retry = true) {
    try {
      await chrome.tabs.sendMessage(tabId, message);
    } catch (error) {
      if (retry) {
        setTimeout(() => {
          this.sendPanelCommand(tabId, message, false);
        }, 150);
      } else {
        console.warn("Unable to communicate with Square Search panel.", error);
      }
    }
  }

  async fetchSelectionText(tabId) {
    try {
      const [result] = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => window.getSelection()?.toString() || "",
      });
      return result?.result || "";
    } catch (error) {
      console.warn("Failed to read selection text.", error);
      return "";
    }
  }

  async queryActiveTab() {
    const [activeTab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    return activeTab;
  }
}

new BackgroundController();
