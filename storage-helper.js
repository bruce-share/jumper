export function saveSiteMapToStorage(sitemapText) {
    if (sitemapText.length>80000) {
        console.error("Can't save over 80KB");
        return;
    }
    saveTextToStorage(sitemapText)
}
export async function loadSiteMapFromStorage() {
   let sitemapText = "";
   sitemapText = await loadBigSiteMapFromStorage();
   if (sitemapText == "" || sitemapText == "undefined") {
       console.log("Loaded text from chunks is empty")
       sitemapText = await loadSmallSiteMapFromStorage();
   }
   return sitemapText;
}

export function loadSiteMapFromFile(saveFunction) {
    return new Promise((resolve, reject) =>  {
        const fileURL = 'data/sitemap.txt'
        const options = {
            method: 'GET'
        };
        fetch(fileURL, options)
            .then(response => response.text())
            .then(text => resolve(text))
            .catch(error => reject(error));
    });
}


function loadSmallSiteMapFromStorage() {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get('sitemap', (result) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(result.sitemap);
      }
    });
  });
}


function loadBigSiteMapFromStorage() {
  return new Promise((resolve, reject) => {
       loadTextFromStorage(resolve)
  });
}

// Define the maximum chunk size in bytes
const MAX_CHUNK_SIZE = 8000;

// Function to split a long text into chunks
function splitTextIntoChunks(text) {
  const chunks = [];
  let offset = 0;

  while (offset < text.length) {
    const chunk = text.slice(offset, offset + MAX_CHUNK_SIZE);
    chunks.push(chunk);
    offset += MAX_CHUNK_SIZE;
  }

  return chunks;
}

// Function to combine chunks into a long text
function combineChunksIntoText(chunks) {
  let text = '';
  for (const chunk of chunks) {
    text += chunk;
  }
  return text;
}

// Function to save text chunks to storage
function saveTextToStorage(text) {
  const chunks = splitTextIntoChunks(text);

  for (let i = 0; i < chunks.length; i++) {
    const key = 'chunk_'+i;
    console.log("Save chunk: "+key)
    chrome.storage.sync.set({ [key]: chunks[i] });
  }

  chrome.storage.sync.set({ numChunks: chunks.length });
}

// Function to load text chunks from storage
function loadTextFromStorage(callback) {
  chrome.storage.sync.get(['numChunks'], (result) => {
    const numChunks = result.numChunks;

    if (numChunks == null) {
      callback(null);
      return;
    }

    const chunks = [];

    for (let i = 0; i < numChunks; i++) {
      const key = 'chunk_'+i;
      chrome.storage.sync.get([key], (result) => {
        chunks[i] = result[key];

        if (chunks.filter((chunk) => chunk != null).length === numChunks) {
          const text = combineChunksIntoText(chunks);
          console.log("Text is loaded from chunks: "+text.length)
          callback(text);
        }
      });
    }
  });
}
