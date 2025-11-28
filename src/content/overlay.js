(() => {
  const APP_KEY = "__squareSearchAppInstance";
  if (window[APP_KEY]) {
    window[APP_KEY].startSelection();
    return;
  }

  class SelectionOverlay {
    constructor(onComplete, onCancel) {
      this.onComplete = onComplete;
      this.onCancel = onCancel;
      this.overlay = null;
      this.frame = null;
      this.isDrawing = false;
      this.startX = 0;
      this.startY = 0;
      this.currentX = 0;
      this.currentY = 0;
    }

    start() {
      if (this.overlay) {
        return;
      }
      this.overlay = document.createElement("div");
      this.overlay.className = "square-search-overlay";
      this.frame = document.createElement("div");
      this.frame.className = "square-search-overlay__frame";
      this.frame.style.display = "none";
      this.overlay.appendChild(this.frame);

      const hint = document.createElement("div");
      hint.className = "square-search-overlay__hint";
      hint.textContent = "Press ESC to cancel";
      this.overlay.appendChild(hint);

      document.body.appendChild(this.overlay);
      this.bind();
    }

    bind() {
      this.onMouseDown = (event) => {
        this.isDrawing = true;
        this.startX = event.clientX;
        this.startY = event.clientY;
        this.frame.style.display = "block";
        this.update(event);
        event.preventDefault();
      };
      this.onMouseMove = (event) => {
        if (!this.isDrawing) {
          return;
        }
        this.update(event);
      };
      this.onMouseUp = () => {
        if (!this.isDrawing) {
          return;
        }
        this.isDrawing = false;
        const region = this.buildRegion();
        if (region.width > 0 && region.height > 0) {
          this.disable();
          this.onComplete(region);
        } else {
          this.dispose();
        }
      };
      this.onKeyDown = (event) => {
        if (event.key === "Escape") {
          this.cancel();
        }
      };
      this.overlay.addEventListener("mousedown", this.onMouseDown);
      window.addEventListener("mousemove", this.onMouseMove, true);
      window.addEventListener("mouseup", this.onMouseUp, true);
      window.addEventListener("keydown", this.onKeyDown, true);
    }

    update(event) {
      this.currentX = event.clientX;
      this.currentY = event.clientY;
      const rect = this.buildRegion();
      this.frame.style.left = `${rect.x}px`;
      this.frame.style.top = `${rect.y}px`;
      this.frame.style.width = `${rect.width}px`;
      this.frame.style.height = `${rect.height}px`;
    }

    buildRegion() {
      const x = Math.min(this.startX, this.currentX);
      const y = Math.min(this.startY, this.currentY);
      const width = Math.abs(this.currentX - this.startX);
      const height = Math.abs(this.currentY - this.startY);
      return {
        x,
        y,
        width,
        height,
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
        scrollX: window.scrollX,
        scrollY: window.scrollY,
      };
    }

    disable() {
      if (this.overlay) {
        this.overlay.style.opacity = "0";
        this.overlay.style.pointerEvents = "none";
        this.frame.style.display = "none";
      }
      window.removeEventListener("mousemove", this.onMouseMove, true);
      window.removeEventListener("mouseup", this.onMouseUp, true);
      window.removeEventListener("keydown", this.onKeyDown, true);
    }

    cancel() {
      if (this.onCancel) {
        this.onCancel();
      }
      this.dispose();
    }

    dispose() {
      window.removeEventListener("mousemove", this.onMouseMove, true);
      window.removeEventListener("mouseup", this.onMouseUp, true);
      window.removeEventListener("keydown", this.onKeyDown, true);
      this.overlay?.remove();
      this.overlay = null;
      this.frame = null;
    }
  }

  const MarkdownRenderer = (() => {
    const escapeHtml = (str = "") =>
      str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

    const renderLists = (html) =>
      html.replace(/(^|\n)([-*] .+(?:\n[-*] .+)*)/g, (_, prefix, block) => {
        const items = block
          .split("\n")
          .map((line) => line.replace(/^[-*]\s+/, "").trim())
          .filter(Boolean)
          .map((content) => `<li>${content}</li>`)
          .join("");
        return `${prefix}<ul>${items}</ul>`;
      });

    const renderOrdered = (html) =>
      html.replace(/(^|\n)(\d+\.\s.+(?:\n\d+\.\s.+)*)/g, (_, prefix, block) => {
        const items = block
          .split("\n")
          .map((line) => line.replace(/^\d+\.\s+/, "").trim())
          .filter(Boolean)
          .map((content) => `<li>${content}</li>`)
          .join("");
        return `${prefix}<ol>${items}</ol>`;
      });

    const applyParagraphs = (html) =>
      html
        .split(/\n{2,}/)
        .map((chunk) => {
          if (!chunk.trim()) {
            return "";
          }
          if (/^\s*<(ul|ol|h\d|pre)/.test(chunk)) {
            return chunk;
          }
          return `<p>${chunk.replace(/\n/g, "<br />")}</p>`;
        })
        .join("");

    const render = (input = "") => {
      if (!input.trim()) {
        return "";
      }
      const codeBlocks = [];
      let html = input.replace(/```([\s\S]*?)```/g, (_, code) => {
        const token = `__SQUARE_CODE_${codeBlocks.length}__`;
        codeBlocks.push(`<pre><code>${escapeHtml(code.trim())}</code></pre>`);
        return token;
      });
      html = escapeHtml(html);
      html = html.replace(/^###### (.*)$/gm, "<h6>$1</h6>");
      html = html.replace(/^##### (.*)$/gm, "<h5>$1</h5>");
      html = html.replace(/^#### (.*)$/gm, "<h4>$1</h4>");
      html = html.replace(/^### (.*)$/gm, "<h3>$1</h3>");
      html = html.replace(/^## (.*)$/gm, "<h2>$1</h2>");
      html = html.replace(/^# (.*)$/gm, "<h1>$1</h1>");
      html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
      html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
      html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
      html = html.replace(
        /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
      );
      html = renderLists(html);
      html = renderOrdered(html);
      html = applyParagraphs(html);
      html = html.replace(
        /__SQUARE_CODE_(\d+)__/g,
        (_, idx) => codeBlocks[Number(idx)] || ""
      );
      return html;
    };

    return { render };
  })();

  class SidePanel {
    constructor() {
      this.root = null;
      this.resultAIEl = null;
      this.resultWebEl = null;
      this.statusEl = null;
      this.previewImg = null;
      this.previewContainer = null;
      this.previewActions = null;
      this.selectionSection = null;
      this.promptInput = null;
      this.runButton = null;
      this.collapseButton = null;
      this.googleButton = null;
      this.googleHandler = null;
      this.tabButtons = {};
      this.activeTab = "ai";
      this.closeButton = null;
      this.themeButton = null;
      this.theme = "light";
      this.themeChangeListener = null;
      this.objectUrl = null;
      this.isVisible = false;
      this.isCollapsed = false;
      this.runHandler = null;
      this.closeHandler = null;
      this.build();
    }

    build() {
      this.root = document.createElement("aside");
      this.root.className = "square-search-panel";

      const header = document.createElement("div");
      header.className = "square-search-panel__header";
      this.collapseButton = document.createElement("button");
      this.collapseButton.className = "square-search-panel__icon-btn";
      this.collapseButton.type = "button";
      this.collapseButton.addEventListener("click", () => this.toggle());
      const title = document.createElement("div");
      title.className = "square-search-panel__title";
      title.textContent = "Square Search";
      this.themeButton = document.createElement("button");
      this.themeButton.className =
        "square-search-panel__icon-btn square-search-panel__icon-btn--theme";
      this.themeButton.type = "button";
      this.themeButton.addEventListener("click", () => this.toggleTheme());
      this.closeButton = document.createElement("button");
      this.closeButton.className =
        "square-search-panel__icon-btn square-search-panel__icon-btn--ghost";
      this.closeButton.type = "button";
      this.closeButton.textContent = "✕";
      this.closeButton.setAttribute("aria-label", "Close Square Search");
      this.closeButton.addEventListener("click", () => this.close());

      const iconGroup = document.createElement("div");
      iconGroup.className = "square-search-panel__icon-group";
      iconGroup.append(this.themeButton, this.closeButton);

      header.appendChild(this.collapseButton);
      header.appendChild(title);
      header.appendChild(iconGroup);

      const body = document.createElement("div");
      body.className = "square-search-panel__body";

      this.previewImg = document.createElement("img");
      this.previewContainer = document.createElement("div");
      this.previewContainer.className = "square-search-panel__preview";
      this.previewContainer.style.display = "none";
      this.previewContainer.appendChild(this.previewImg);

      this.previewActions = document.createElement("div");
      this.previewActions.className = "square-search-panel__preview-actions";
      this.previewActions.style.display = "none";
      this.googleButton = document.createElement("button");
      this.googleButton.type = "button";
      this.googleButton.className =
        "square-search-chip square-search-chip--google";
      this.googleButton.textContent = "Search on Google";
      this.googleButton.disabled = true;
      this.googleButton.addEventListener("click", () => {
        if (this.googleHandler) {
          this.googleHandler();
        }
      });
      this.previewActions.appendChild(this.googleButton);

      this.statusEl = document.createElement("div");
      this.statusEl.className = "square-search-panel__status";
      this.statusEl.textContent = "Select an area to begin.";

      this.selectionSection = document.createElement("div");
      this.selectionSection.className = "square-search-panel__selection";
      this.selectionSection.style.display = "none";
      const selectionTitle = document.createElement("div");
      selectionTitle.className = "square-search-panel__selection-label";
      selectionTitle.textContent = "Selected text";
      this.selectionPreview = document.createElement("pre");
      this.selectionPreview.className =
        "square-search-panel__selection-preview";
      this.selectionPreview.textContent =
        "Highlight text and press the shortcut to search without capturing.";
      this.selectionSection.append(selectionTitle, this.selectionPreview);

      const tabs = document.createElement("div");
      tabs.className = "square-search-panel__tabs";
      this.tabButtons.ai = this.buildTabButton("AI", "ai");
      this.tabButtons.web = this.buildTabButton("Web", "web");
      tabs.append(this.tabButtons.ai, this.tabButtons.web);

      const resultsContainer = document.createElement("div");
      resultsContainer.className = "square-search-panel__results";
      this.resultAIEl = document.createElement("div");
      this.resultAIEl.className =
        "square-search-panel__result square-search-panel__result--ai";
      this.resultAIEl.textContent = "Your Gemini answers will appear here.";
      this.resultWebEl = document.createElement("div");
      this.resultWebEl.className =
        "square-search-panel__result square-search-panel__result--web";
      this.resultWebEl.textContent =
        "Add a Google Cloud Vision API key in options to see related web matches.";
      resultsContainer.append(this.resultAIEl, this.resultWebEl);

      const promptLabel = document.createElement("label");
      promptLabel.className = "square-search-panel__prompt-label";
      const labelText = document.createElement("span");
      labelText.textContent = "Refine prompt";
      this.promptInput = document.createElement("textarea");
      this.promptInput.id = "square-search-prompt";
      this.promptInput.placeholder = "Ask anything about this selection...";
      promptLabel.appendChild(labelText);
      promptLabel.appendChild(this.promptInput);

      this.runButton = document.createElement("button");
      this.runButton.type = "button";
      this.runButton.className = "square-search-panel__run";
      this.runButton.textContent = "Search with Gemini";
      this.runButton.addEventListener("click", () => {
        if (this.runHandler) {
          this.runHandler(this.getPrompt());
        }
      });

      body.append(
        this.previewContainer,
        this.previewActions,
        this.selectionSection,
        this.statusEl,
        tabs,
        resultsContainer,
        promptLabel,
        this.runButton
      );

      this.root.append(header, body);
      document.body.appendChild(this.root);
      this.setActiveTab("ai");
      this.updateToggleLabel();
      this.initializeTheme();
      this.subscribeThemeChanges();
    }

    open() {
      this.isVisible = true;
      this.isCollapsed = false;
      this.root.classList.add("square-search-panel--visible");
      this.root.classList.remove("square-search-panel--collapsed");
      this.updateToggleLabel();
      this.bindKeyHandlers();
    }

    toggle() {
      if (!this.isVisible) {
        this.open();
        return;
      }
      this.isCollapsed = !this.isCollapsed;
      this.root.classList.toggle(
        "square-search-panel--collapsed",
        this.isCollapsed
      );
      this.updateToggleLabel();
    }

    updateToggleLabel() {
      const label = this.isCollapsed
        ? "Show results panel"
        : "Hide results panel";
      const symbol = this.isCollapsed ? "❮" : "❯";
      this.collapseButton.textContent = symbol;
      this.collapseButton.setAttribute("aria-label", label);
    }

    setStatus(message) {
      this.statusEl.textContent = message;
    }

    buildTabButton(label, key) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "square-search-panel__tab";
      button.textContent = label;
      button.addEventListener("click", () => this.setActiveTab(key));
      return button;
    }

    setActiveTab(key) {
      this.activeTab = key;
      Object.entries(this.tabButtons).forEach(([tabKey, btn]) => {
        if (!btn) {
          return;
        }
        const isActive = tabKey === key;
        btn.classList.toggle("is-active", isActive);
      });
      if (this.resultAIEl && this.resultWebEl) {
        this.resultAIEl.classList.toggle("is-inactive", key !== "ai");
        this.resultAIEl.classList.toggle("is-active", key === "ai");
        this.resultWebEl.classList.toggle("is-inactive", key !== "web");
        this.resultWebEl.classList.toggle("is-active", key === "web");
      }
    }

    async initializeTheme() {
      try {
        const { uiPreferences } = await chrome.storage.sync.get(
          "uiPreferences"
        );
        const theme = uiPreferences?.theme || "light";
        this.applyTheme(theme);
      } catch (error) {
        console.warn("Square Search: failed to load theme.", error);
        this.applyTheme("light");
      }
    }

    applyTheme(theme) {
      this.theme = theme === "dark" ? "dark" : "light";
      document.documentElement.classList.toggle(
        "square-search-theme-dark",
        this.theme === "dark"
      );
      if (this.root) {
        this.root.classList.toggle(
          "square-search-panel--theme-dark",
          this.theme === "dark"
        );
      }
      if (this.themeButton) {
        this.themeButton.textContent = this.theme === "dark" ? "☾" : "☀";
        this.themeButton.setAttribute(
          "aria-label",
          this.theme === "dark"
            ? "Switch to light theme"
            : "Switch to dark theme"
        );
      }
    }

    async toggleTheme() {
      const next = this.theme === "dark" ? "light" : "dark";
      this.applyTheme(next);
      try {
        await this.persistTheme(next);
      } catch (error) {
        console.warn("Square Search: failed to persist theme.", error);
      }
    }

    async persistTheme(theme) {
      const { uiPreferences } = await chrome.storage.sync.get("uiPreferences");
      await chrome.storage.sync.set({
        uiPreferences: { ...(uiPreferences || {}), theme },
      });
    }

    subscribeThemeChanges() {
      if (this.themeChangeListener) {
        return;
      }
      this.themeChangeListener = (changes, area) => {
        if (area !== "sync" || !changes.uiPreferences) {
          return;
        }
        const nextTheme = changes.uiPreferences.newValue?.theme;
        if (nextTheme && nextTheme !== this.theme) {
          this.applyTheme(nextTheme);
        }
      };
      chrome.storage.onChanged.addListener(this.themeChangeListener);
    }

    setAIResult(message) {
      this.resultAIEl.classList.remove("is-error");
      const html = MarkdownRenderer.render(message || "");
      if (html) {
        this.resultAIEl.innerHTML = html;
      } else {
        this.resultAIEl.textContent = "No details were returned for this area.";
      }
    }

    setAIError(message) {
      this.resultAIEl.classList.add("is-error");
      this.resultAIEl.textContent = message;
    }

    setWebLoading(isLoading) {
      if (!this.resultWebEl) {
        return;
      }
      this.resultWebEl.classList.toggle("is-loading", isLoading);
      if (isLoading) {
        this.resultWebEl.classList.remove("is-error");
        this.resultWebEl.innerHTML =
          '<p class="square-search-panel__web-status">Searching the web for matches…</p>';
      }
    }

    setWebResult(result) {
      if (!this.resultWebEl) {
        return;
      }
      this.resultWebEl.classList.remove("is-error", "is-loading");
      const sections = [];
      if (result?.bestGuesses?.length) {
        sections.push(
          `<div class="square-search-panel__web-section"><h3>Best guesses</h3><ul class="square-search-panel__web-list">${result.bestGuesses
            .map((label) => `<li>${SidePanel.escapeHtml(label)}</li>`)
            .join("")}</ul></div>`
        );
      }
      if (result?.pages?.length) {
        const topPages = result.pages.slice(0, 4);
        sections.push(
          `<div class="square-search-panel__web-section"><h3>Pages with matches</h3><ul class="square-search-panel__web-list">${topPages
            .map(
              (page) =>
                `<li><a href="${SidePanel.escapeAttr(
                  page.url
                )}" target="_blank" rel="noopener noreferrer">${SidePanel.escapeHtml(
                  page.title || page.url
                )}</a></li>`
            )
            .join("")}</ul></div>`
        );
      }
      if (result?.entities?.length) {
        const topEntities = result.entities.slice(0, 4);
        sections.push(
          `<div class="square-search-panel__web-section"><h3>Web entities</h3><ul class="square-search-panel__web-list">${topEntities
            .map(
              (entity) =>
                `<li>${SidePanel.escapeHtml(
                  entity.description
                )}<span class="square-search-panel__web-meta">${
                  Math.round((entity.score || 0) * 100) / 100
                }</span></li>`
            )
            .join("")}</ul></div>`
        );
      }
      if (!sections.length) {
        this.setWebInfo("No related web matches found.");
        return;
      }
      this.resultWebEl.innerHTML = sections.join("");
    }

    setWebError(message) {
      if (!this.resultWebEl) {
        return;
      }
      this.resultWebEl.classList.add("is-error");
      this.resultWebEl.classList.remove("is-loading");
      this.resultWebEl.textContent = message;
    }

    static escapeHtml(value = "") {
      return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    }

    static escapeAttr(value = "") {
      return SidePanel.escapeHtml(value);
    }

    close() {
      this.isVisible = false;
      this.root.classList.remove("square-search-panel--visible");
      this.root.classList.remove("square-search-panel--collapsed");
      this.unbindKeyHandlers();
      if (this.closeHandler) {
        this.closeHandler();
      }
    }

    bindKeyHandlers() {
      this.onKeyDown = (event) => {
        if (event.key === "Escape" && this.isVisible && !event.target.matches("textarea, input")) {
          this.close();
        }
      };
      window.addEventListener("keydown", this.onKeyDown, true);
    }

    unbindKeyHandlers() {
      if (this.onKeyDown) {
        window.removeEventListener("keydown", this.onKeyDown, true);
        this.onKeyDown = null;
      }
    }

    async setPreview(blob) {
      if (this.objectUrl) {
        URL.revokeObjectURL(this.objectUrl);
        this.objectUrl = null;
      }
      if (!blob) {
        this.previewImg.removeAttribute("src");
        if (this.previewContainer) {
          this.previewContainer.style.display = "none";
        }
        if (this.previewActions) {
          this.previewActions.style.display = "none";
        }
        return;
      }
      if (this.previewContainer) {
        this.previewContainer.style.display = "flex";
      }
      if (this.previewActions) {
        this.previewActions.style.display = "flex";
      }
      this.objectUrl = URL.createObjectURL(blob);
      this.previewImg.src = this.objectUrl;
    }

    getPrompt() {
      return this.promptInput.value.trim();
    }

    getSelectionPreview() {
      return this.selectionPreview?.dataset?.text || "";
    }

    setPromptValue(value) {
      this.promptInput.value = value || "";
    }

    setSelectionPreview(text) {
      if (!this.selectionPreview || !this.selectionSection) {
        return;
      }
      const cleaned = text?.trim();
      if (cleaned) {
        this.selectionSection.style.display = "flex";
        this.selectionPreview.textContent = cleaned;
        this.selectionPreview.dataset.text = cleaned;
        this.selectionPreview.classList.add("has-content");
      } else {
        this.selectionSection.style.display = "none";
        this.selectionPreview.textContent =
          "Highlight text and press the shortcut to search without capturing.";
        delete this.selectionPreview.dataset.text;
        this.selectionPreview.classList.remove("has-content");
      }
    }

    setWebInfo(message) {
      if (!this.resultWebEl) {
        return;
      }
      this.resultWebEl.classList.remove("is-error", "is-loading");
      this.resultWebEl.textContent = message;
    }

    setLoading(isLoading) {
      this.runButton.disabled = isLoading;
      this.root.classList.toggle("square-search-panel--loading", isLoading);
      this.runButton.textContent = isLoading
        ? "Thinking…"
        : "Search with Gemini";
    }

    onRun(handler) {
      this.runHandler = handler;
    }

    onGoogleSearch(handler) {
      this.googleHandler = handler;
    }

    onClose(handler) {
      this.closeHandler = handler;
    }

    setGoogleAvailable(isAvailable) {
      if (this.googleButton) {
        this.googleButton.disabled = !isAvailable;
      }
    }

    setGoogleLoading(isLoading) {
      if (!this.googleButton) {
        return;
      }
      this.googleButton.classList.toggle("is-loading", isLoading);
      this.googleButton.disabled = isLoading;
    }
  }

  class SquareSearchApp {
    constructor() {
      this.panel = new SidePanel();
      this.overlay = null;
      this.croppedBlob = null;
      this.croppedBase64 = null;
      this.imageUtils = null;
      this.modelClient = null;
      this.webClient = null;
      this.storage = null;
      this.currentMode = "image";
      this.registerMessageHandlers();
      this.panel.onRun((prompt) => this.runSearch(prompt));
      this.panel.onGoogleSearch(() => this.searchOnGoogle());
      this.panel.onClose(() => this.quitExtension());
    }

    startSelection() {
      this.currentMode = "image";
      this.croppedBlob = null;
      this.croppedBase64 = null;
      this.panel.open();
      this.panel.setActiveTab("ai");
      this.panel.setPromptValue("");
      this.panel.setPreview(null);
      this.panel.setSelectionPreview("");
      this.panel.setGoogleAvailable(false);
      this.panel.setStatus("Select an area to begin.");
      this.panel.setWebInfo(
        "Web results will appear after you capture an area."
      );
      this.overlay = new SelectionOverlay(
        (region) => this.handleRegion(region),
        () => this.quitExtension()
      );
      this.overlay.start();
    }

    quitExtension() {
      if (this.overlay) {
        this.overlay.dispose();
        this.overlay = null;
      }
      this.panel.isVisible = false;
      this.panel.root.classList.remove("square-search-panel--visible");
      this.panel.root.classList.remove("square-search-panel--collapsed");
      this.panel.unbindKeyHandlers();
      this.croppedBlob = null;
      this.croppedBase64 = null;
    }

    startTextMode(selectedText) {
      const cleaned = selectedText?.trim() || "";
      this.currentMode = "text";
      this.croppedBlob = null;
      this.croppedBase64 = null;
      this.panel.open();
      this.panel.setActiveTab("ai");
      this.panel.setPromptValue("");
      this.panel.setPreview(null);
      this.panel.setGoogleAvailable(false);
      this.panel.setWebInfo(
        "Web results are only available after capturing an area."
      );
      this.panel.setSelectionPreview(cleaned);
      this.panel.setStatus("Add a prompt to search with Gemini.");
    }

    async handleRegion(region) {
      if (!region || region.width === 0 || region.height === 0) {
        this.panel.setStatus("Selection cancelled.");
        if (this.overlay) {
          this.overlay.dispose();
          this.overlay = null;
        }
        return;
      }
      if (this.overlay) {
        this.overlay.dispose();
        this.overlay = null;
      }
      this.croppedBlob = null;
      this.croppedBase64 = null;
      this.panel.open();
      this.panel.setGoogleAvailable(false);
      this.panel.setStatus("Capturing selection…");
      try {
        await chrome.runtime.sendMessage({
          type: "REGION_SELECTED",
          payload: region,
        });
      } catch (error) {
        console.error("Capture request failed", error);
        this.panel.setAIError("Unable to capture this page. Try again.");
      }
    }

    registerMessageHandlers() {
      chrome.runtime.onMessage.addListener((message) => {
        if (message?.type === "SQUARE_SEARCH_SHOW_RESULTS") {
          this.handleCapturedData().catch((error) => {
            console.error("Failed to process capture", error);
            this.panel.setAIError(
              "Something went wrong while preparing the image."
            );
          });
          return true;
        }
        if (message?.type === "SQUARE_SEARCH_START_CAPTURE") {
          this.startSelection();
          return true;
        }
        if (message?.type === "SQUARE_SEARCH_TEXT_MODE") {
          this.startTextMode(message?.payload?.text || "");
          return true;
        }
      });
    }

    async handleCapturedData() {
      const storage = await this.getStorage();
      const [imageDataUrl, region] = await Promise.all([
        storage.getLocal("capturedImage"),
        storage.getLocal("capturedRegion"),
      ]);
      if (!imageDataUrl || !region) {
        this.panel.setAIError("Captured data not found. Please try again.");
        return;
      }
      const ImageUtils = await this.getImageUtils();
      const img = await ImageUtils.loadImageFromDataUrl(imageDataUrl);
      const scaled = this.scaleRegion(region, img);
      this.croppedBlob = await ImageUtils.cropImageToBlob(img, scaled);
      this.croppedBase64 = await ImageUtils.blobToBase64(this.croppedBlob);
      await storage.removeLocal(["capturedImage", "capturedRegion"]);
      await this.panel.setPreview(this.croppedBlob);
      this.panel.setSelectionPreview("");
      this.panel.setStatus("Ask anything about this selection.");
      this.panel.setGoogleAvailable(true);
      await this.runSearch(this.panel.getPrompt());
      this.runWebSearch();
    }

    async runSearch(promptText) {
      const prompt = (promptText || "").trim();
      const ModelClient = await this.getModelClient();
      this.panel.setLoading(true);
      this.panel.setStatus("Thinking with Gemini…");
      try {
        let result;
        if (this.currentMode === "text") {
          if (!prompt) {
            this.panel.setLoading(false);
            this.panel.setAIError("Enter a prompt to search with Gemini.");
            return;
          }
          result = await ModelClient.searchText({
            prompt,
            context: this.panel.getSelectionPreview(),
          });
        } else {
          if (!this.croppedBlob) {
            throw new Error("Select an area before running a search.");
          }
          result = await ModelClient.searchImage(this.croppedBlob, prompt);
        }
        const answer =
          result?.text?.trim() || "No details were returned for this request.";
        this.panel.setAIResult(answer);
        this.panel.setStatus("Result updated.");
      } catch (error) {
        console.error("Model call failed", error);
        this.panel.setAIError(error.message || "Unable to fetch a response.");
        this.panel.setStatus("Please adjust your selection or prompt.");
      } finally {
        this.panel.setLoading(false);
      }
    }

    async runWebSearch() {
      if (this.currentMode !== "image") {
        this.panel.setWebInfo("Capture an area to view related web results.");
        return;
      }
      if (!this.croppedBase64) {
        this.panel.setWebError("Select an area before searching the web.");
        return;
      }
      let WebSearchClient;
      try {
        WebSearchClient = await this.getWebClient();
      } catch (error) {
        this.panel.setWebError(
          error?.message ||
            "Add a Google Cloud Vision API key in settings to view web matches."
        );
        return;
      }
      this.panel.setWebLoading(true);
      try {
        const result = await WebSearchClient.searchWeb(this.croppedBase64);
        this.panel.setWebResult(result);
      } catch (error) {
        console.error("Web search failed", error);
        this.panel.setWebError(
          error?.message || "Unable to fetch related web results."
        );
      } finally {
        this.panel.setWebLoading(false);
      }
    }

    async searchOnGoogle() {
      if (this.currentMode !== "image") {
        this.panel.setAIError("Capture an area before opening Google Lens.");
        return;
      }
      if (!this.croppedBlob) {
        this.panel.setAIError("Select an area before sending to Google.");
        return;
      }
      if (!this.croppedBase64) {
        const ImageUtils = await this.getImageUtils();
        this.croppedBase64 = await ImageUtils.blobToBase64(this.croppedBlob);
      }
      this.panel.setStatus("Opening Google Lens…");
      this.panel.setGoogleLoading(true);
      try {
        const response = await chrome.runtime.sendMessage({
          type: "SQUARE_SEARCH_GOOGLE_LENS",
          payload: { imageBase64: this.croppedBase64 },
        });
        if (!response?.success) {
          throw new Error(response?.error || "Google Lens search failed.");
        }
        this.panel.setStatus("Google Lens opened in a new tab.");
      } catch (error) {
        console.error("Google Lens search failed", error);
        this.panel.setAIError(
          error?.message || "Failed to open Google Lens search."
        );
      } finally {
        this.panel.setGoogleLoading(false);
      }
    }

    scaleRegion(region, img) {
      const scaleX = img.width / region.windowWidth;
      const scaleY = img.height / region.windowHeight;
      return {
        x: Math.max(0, region.x * scaleX),
        y: Math.max(0, region.y * scaleY),
        width: Math.max(1, region.width * scaleX),
        height: Math.max(1, region.height * scaleY),
      };
    }

    async getImageUtils() {
      if (!this.imageUtils) {
        const mod = await import(
          chrome.runtime.getURL("src/utils/imageUtils.js")
        );
        this.imageUtils = mod.default;
      }
      return this.imageUtils;
    }

    async getModelClient() {
      if (!this.modelClient) {
        const mod = await import(
          chrome.runtime.getURL("src/config/modelClient.js")
        );
        this.modelClient = mod.default;
      }
      return this.modelClient;
    }

    async getWebClient() {
      if (!this.webClient) {
        const mod = await import(
          chrome.runtime.getURL("src/config/webSearchClient.js")
        );
        this.webClient = mod.default;
      }
      return this.webClient;
    }

    async getStorage() {
      if (!this.storage) {
        const mod = await import(chrome.runtime.getURL("src/utils/storage.js"));
        this.storage = mod.default;
      }
      return this.storage;
    }
  }

  if (!window[APP_KEY]) {
    window[APP_KEY] = new SquareSearchApp();
  }
})();
