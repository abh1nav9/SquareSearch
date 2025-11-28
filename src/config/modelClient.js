import StorageService from "../utils/storage.js";
import searchImageWithGemini, {
  searchTextWithGemini,
} from "./providers/gemini.js";

export const DEFAULT_SETTINGS = {
  apiKey: "",
  model: "gemini-2.5-flash",
  vision: {
    apiKey: "",
  },
};

class ModelClient {
  static async searchImage(imageBlob, promptText) {
    const stored =
      (await StorageService.getSync("modelSettings")) || DEFAULT_SETTINGS;
    const settings = {
      ...DEFAULT_SETTINGS,
      ...stored,
    };
    if (!settings.apiKey) {
      throw new Error(
        "No Gemini API key set. Please configure it in settings."
      );
    }
    return searchImageWithGemini(imageBlob, promptText, settings);
  }

  static async searchText({ prompt, context }) {
    const stored =
      (await StorageService.getSync("modelSettings")) || DEFAULT_SETTINGS;
    const settings = {
      ...DEFAULT_SETTINGS,
      ...stored,
    };
    if (!settings.apiKey) {
      throw new Error(
        "No Gemini API key set. Please configure it in settings."
      );
    }
    return searchTextWithGemini({ prompt, context }, settings);
  }
}

export default ModelClient;
