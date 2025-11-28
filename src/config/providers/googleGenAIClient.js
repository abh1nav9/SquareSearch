class GoogleGenAI {
  constructor({ apiKey }) {
    if (!apiKey) {
      throw new Error("Gemini API key is required.");
    }
    this.apiKey = apiKey;
    this.models = {
      generateContent: this.generateContent.bind(this),
    };
  }

  async generateContent({ model, contents }) {
    if (!model) {
      throw new Error("Gemini model is required.");
    }
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model
    )}:generateContent?key=${encodeURIComponent(this.apiKey)}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: this.normalizeContents(contents) }),
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `Gemini request failed: ${response.status} ${response.statusText} - ${body}`
      );
    }
    const raw = await response.json();
    return {
      ...raw,
      text: this.extractText(raw),
    };
  }

  normalizeContents(contents) {
    if (typeof contents === "string") {
      return [
        {
          role: "user",
          parts: [{ text: contents }],
        },
      ];
    }
    if (Array.isArray(contents)) {
      return contents;
    }
    return [];
  }

  extractText(raw) {
    return (
      raw?.candidates
        ?.flatMap(
          (candidate) =>
            candidate?.content?.parts
              ?.map((part) => part.text || "")
              .filter(Boolean) || []
        )
        .join("\n")
        .trim() || ""
    );
  }
}

export { GoogleGenAI };
