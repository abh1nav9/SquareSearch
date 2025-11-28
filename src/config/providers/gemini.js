import ImageUtils from "../../utils/imageUtils.js";
import { GoogleGenAI } from "./googleGenAIClient.js";

class GeminiProvider {
  static async send(imageBlob, promptText, geminiSettings) {
    const base64 = await ImageUtils.blobToBase64(imageBlob);
    const model = geminiSettings.model || "gemini-2.5-flash";
    const ai = new GoogleGenAI({ apiKey: geminiSettings.apiKey });
    const response = await ai.models.generateContent({
      model,
      contents: [
        {
          role: "user",
          parts: [
            {
              text:
                promptText?.trim() ||
                "Describe the important details from this screenshot.",
            },
            {
              inlineData: {
                mimeType: "image/png",
                data: base64,
              },
            },
          ],
        },
      ],
    });
    return {
      provider: "gemini",
      text: response.text || "No response text returned.",
      raw: response,
      extra: {},
    };
  }

  static async sendText({ prompt, context }, geminiSettings) {
    const model = geminiSettings.model || "gemini-2.5-flash";
    const ai = new GoogleGenAI({ apiKey: geminiSettings.apiKey });
    const response = await ai.models.generateContent({
      model,
      contents: [
        {
          role: "user",
          parts: [
            {
              text: context
                ? `Selection:\n"${context}"\n\nPrompt:\n${prompt}`
                : prompt ||
                  "Provide insights about this selected text.",
            },
          ],
        },
      ],
    });
    return {
      provider: "gemini",
      text: response.text || "No response text returned.",
      raw: response,
      extra: {},
    };
  }
}

const searchImageWithGemini = (imageBlob, promptText, geminiSettings) =>
  GeminiProvider.send(imageBlob, promptText, geminiSettings);

const searchTextWithGemini = (args, geminiSettings) =>
  GeminiProvider.sendText(args, geminiSettings);

export { searchTextWithGemini };
export default searchImageWithGemini;
