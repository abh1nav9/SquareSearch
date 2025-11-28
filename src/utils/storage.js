const SYNC_AREA = chrome.storage.sync;
const LOCAL_AREA = chrome.storage.local;

class StorageService {
  static getSync(key) {
    return new Promise((resolve, reject) => {
      SYNC_AREA.get([key], (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }
        resolve(result[key]);
      });
    });
  }

  static setSync(key, value) {
    return new Promise((resolve, reject) => {
      SYNC_AREA.set({ [key]: value }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }
        resolve();
      });
    });
  }

  static getLocal(key) {
    return new Promise((resolve, reject) => {
      LOCAL_AREA.get([key], (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }
        resolve(result[key]);
      });
    });
  }

  static setLocal(key, value) {
    return new Promise((resolve, reject) => {
      LOCAL_AREA.set({ [key]: value }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }
        resolve();
      });
    });
  }

  static removeLocal(keys) {
    const keyArray = Array.isArray(keys) ? keys : [keys];
    return new Promise((resolve, reject) => {
      LOCAL_AREA.remove(keyArray, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }
        resolve();
      });
    });
  }
}

export default StorageService;
