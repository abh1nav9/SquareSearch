(() => {
  const APP_KEY = "__squareSearchAppInstance";
  if (window[APP_KEY]) {
    window[APP_KEY].startSelection();
    return;
  }

  class SelectionOverlay {
    constructor(onComplete) {
      this.onComplete = onComplete;
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
        this.onComplete(region);
        this.dispose();
      };
      this.onKeyDown = (event) => {
        if (event.key === "Escape") {
          this.dispose();
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
      this.resultEl = null;
      this.statusEl = null;
      this.previewImg = null;
      this.promptInput = null;
      this.runButton = null;
      this.collapseButton = null;
      this.googleButton = null;
      this.googleHandler = null;
      this.closeButton = null;
      this.objectUrl = null;
      this.isVisible = false;
      this.isCollapsed = false;
      this.runHandler = null;
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
      this.closeButton = document.createElement("button");
      this.closeButton.className =
        "square-search-panel__icon-btn square-search-panel__icon-btn--ghost";
      this.closeButton.type = "button";
      this.closeButton.textContent = "✕";
      this.closeButton.setAttribute("aria-label", "Close Square Search");
      this.closeButton.addEventListener("click", () => this.close());

      header.appendChild(this.collapseButton);
      header.appendChild(title);
      header.appendChild(this.closeButton);

      const body = document.createElement("div");
      body.className = "square-search-panel__body";

      this.previewImg = document.createElement("img");
      const previewContainer = document.createElement("div");
      previewContainer.className = "square-search-panel__preview";
      previewContainer.appendChild(this.previewImg);

      const previewActions = document.createElement("div");
      previewActions.className = "square-search-panel__preview-actions";
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
      previewActions.appendChild(this.googleButton);

      this.statusEl = document.createElement("div");
      this.statusEl.className = "square-search-panel__status";
      this.statusEl.textContent = "Select an area to begin.";

      this.resultEl = document.createElement("div");
      this.resultEl.className = "square-search-panel__result";
      this.resultEl.textContent = "Your answers will appear here.";

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
        previewContainer,
        previewActions,
        this.statusEl,
        this.resultEl,
        promptLabel,
        this.runButton
      );

      this.root.append(header, body);
      document.body.appendChild(this.root);
      this.updateToggleLabel();
    }

    open() {
      this.isVisible = true;
      this.isCollapsed = false;
      this.root.classList.add("square-search-panel--visible");
      this.root.classList.remove("square-search-panel--collapsed");
      this.updateToggleLabel();
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

    setResult(message) {
      this.resultEl.classList.remove("is-error");
      const html = MarkdownRenderer.render(message || "");
      if (html) {
        this.resultEl.innerHTML = html;
      } else {
        this.resultEl.textContent = "No details were returned for this area.";
      }
    }

    setError(message) {
      this.resultEl.classList.add("is-error");
      this.resultEl.textContent = message;
    }

    close() {
      this.isVisible = false;
      this.root.classList.remove("square-search-panel--visible");
      this.root.classList.remove("square-search-panel--collapsed");
    }

    async setPreview(blob) {
      if (this.objectUrl) {
        URL.revokeObjectURL(this.objectUrl);
        this.objectUrl = null;
      }
      if (!blob) {
        this.previewImg.removeAttribute("src");
        return;
      }
      this.objectUrl = URL.createObjectURL(blob);
      this.previewImg.src = this.objectUrl;
    }

    getPrompt() {
      return this.promptInput.value.trim();
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
      this.imageUtils = null;
      this.modelClient = null;
      this.storage = null;
      this.registerMessageHandlers();
      this.panel.onRun((prompt) => this.runSearch(prompt));
      this.panel.onGoogleSearch(() => this.searchOnGoogle());
    }

    startSelection() {
      this.overlay = new SelectionOverlay((region) =>
        this.handleRegion(region)
      );
      this.overlay.start();
      this.panel.open();
    }

    async handleRegion(region) {
      if (!region || region.width === 0 || region.height === 0) {
        this.panel.setStatus("Selection cancelled.");
        return;
      }
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
        this.panel.setError("Unable to capture this page. Try again.");
      }
    }

    registerMessageHandlers() {
      chrome.runtime.onMessage.addListener((message) => {
        if (message?.type === "SQUARE_SEARCH_SHOW_RESULTS") {
          this.handleCapturedData().catch((error) => {
            console.error("Failed to process capture", error);
            this.panel.setError(
              "Something went wrong while preparing the image."
            );
          });
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
        this.panel.setError("Captured data not found. Please try again.");
        return;
      }
      const ImageUtils = await this.getImageUtils();
      const img = await ImageUtils.loadImageFromDataUrl(imageDataUrl);
      const scaled = this.scaleRegion(region, img);
      this.croppedBlob = await ImageUtils.cropImageToBlob(img, scaled);
      await storage.removeLocal(["capturedImage", "capturedRegion"]);
      await this.panel.setPreview(this.croppedBlob);
      this.panel.setStatus("Ask anything about this selection.");
      this.panel.setGoogleAvailable(true);
      await this.runSearch(this.panel.getPrompt());
    }

    async runSearch(promptText) {
      if (!this.croppedBlob) {
        this.panel.setError("Select an area before running a search.");
        return;
      }
      const ModelClient = await this.getModelClient();
      this.panel.setLoading(true);
      this.panel.setStatus("Thinking with Gemini…");
      try {
        const result = await ModelClient.searchImage(
          this.croppedBlob,
          promptText
        );
        const answer =
          result?.text?.trim() || "No details were returned for this area.";
        this.panel.setResult(answer);
        this.panel.setStatus("Result updated.");
      } catch (error) {
        console.error("Model call failed", error);
        this.panel.setError(error.message || "Unable to fetch a response.");
        this.panel.setStatus("Please adjust your selection or prompt.");
      } finally {
        this.panel.setLoading(false);
      }
    }

    async searchOnGoogle() {
      if (!this.croppedBlob) {
        this.panel.setError("Select an area before sending to Google.");
        return;
      }
      const ImageUtils = await this.getImageUtils();
      const base64 = await ImageUtils.blobToBase64(this.croppedBlob);
      this.panel.setStatus("Opening Google Lens…");
      this.panel.setGoogleLoading(true);
      try {
        const response = await chrome.runtime.sendMessage({
          type: "SQUARE_SEARCH_GOOGLE_LENS",
          payload: { imageBase64: base64 },
        });
        if (!response?.success) {
          throw new Error(response?.error || "Google Lens search failed.");
        }
        this.panel.setStatus("Google Lens opened in a new tab.");
      } catch (error) {
        console.error("Google Lens search failed", error);
        this.panel.setError(
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

    async getStorage() {
      if (!this.storage) {
        const mod = await import(chrome.runtime.getURL("src/utils/storage.js"));
        this.storage = mod.default;
      }
      return this.storage;
    }
  }

  window[APP_KEY] = new SquareSearchApp();
  window[APP_KEY].startSelection();
})();
