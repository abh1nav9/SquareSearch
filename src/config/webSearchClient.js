import StorageService from "../utils/storage.js";

class WebSearchClient {
  static async searchWeb(imageBase64) {
    const settings =
      (await StorageService.getSync("modelSettings")) || {};
    const apiKey =
      settings?.vision?.apiKey || settings?.visionApiKey || "";
    if (!apiKey) {
      throw new Error(
        "Add a Google Cloud Vision API key in options to view web matches."
      );
    }
    const url = `https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(
      apiKey
    )}`;
    const payload = {
      requests: [
        {
          image: {
            content: imageBase64,
          },
          features: [
            {
              type: "WEB_DETECTION",
              maxResults: 10,
            },
          ],
        },
      ],
    };
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) {
      const message =
        data?.error?.message ||
        `Vision API request failed (${response.status})`;
      throw new Error(message);
    }
    const detection = data?.responses?.[0]?.webDetection;
    if (!detection) {
      return WebSearchClient.emptyResult();
    }
    return {
      bestGuesses:
        detection.bestGuessLabels?.map((label) => label?.label).filter(Boolean) ||
        [],
      entities:
        detection.webEntities
          ?.filter((entity) => entity?.description)
          .map((entity) => ({
            description: entity.description,
            score: entity.score,
          })) || [],
      pages:
        detection.pagesWithMatchingImages
          ?.filter((page) => page?.url)
          .map((page) => ({
            url: page.url,
            title: page.pageTitle,
          })) || [],
      similarImages:
        detection.visuallySimilarImages
          ?.filter((img) => img?.url)
          .map((img) => img.url) || [],
    };
  }

  static emptyResult() {
    return {
      bestGuesses: [],
      entities: [],
      pages: [],
      similarImages: [],
    };
  }
}

export default WebSearchClient;

