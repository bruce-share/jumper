import {saveSiteMapToStorage, loadSiteMapFromStorage, loadSiteMapFromFile} from './storage-helper.js';

let sites = [];
let optionUrl = "chrome-extension://"+chrome.runtime.id+"/data/options.html";
let keywords = [];
let currentFilterPromise;

function xmlEncode(str) {
  return str.replace(/'/g, '&apos;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/&/g, '&amp;');
}

function filterKeywords(text) {
  return new Promise(async (resolve) => {
    if (keywords == undefined || keywords.length == 0) {
         console.error("keywords is empty! - Rebuild it");
         await buildSiteMapFromStorage();
    }
    const filteredKeywords = keywords.filter(keyword => keyword.key.includes(text))
                                     .sort((a, b) => a.key.indexOf(text) - b.key.indexOf(text));

    let suggestFilters = filteredKeywords.slice(0, 10);
    if (suggestFilters.length<10) {
        const filteredTitles = keywords.filter(keyword => keyword.title.includes(text))
                               .sort((a, b) => a.title.indexOf(text) - b.title.indexOf(text));
        suggestFilters.push(...filteredTitles);
        suggestFilters = suggestFilters.slice(0, 10);
    }
    const suggestions = suggestFilters.map(keyword => ({
      content: keyword.key+"\u00A0",
      description: keyword.title
    }));
    resolve(suggestions);
  });
}

chrome.omnibox.onInputChanged.addListener((text, suggest) => {
  // Cancel the previous filter operation if it is still in progress
  if (currentFilterPromise) {
    currentFilterPromise.cancel();
  }
  currentFilterPromise = filterKeywords(text);
  // Wait for the filter operation to complete and provide the suggestions to the user
  currentFilterPromise.then((suggestions) => {
    currentFilterPromise = null;
    suggest(suggestions);
  });
});

chrome.omnibox.onInputEntered.addListener(async (keyword) => {
  console.log("keyword = "+keyword);
  chrome.tabs.query({active: true, currentWindow: true}, async (tabs) => {
    var currentTabId = tabs[0].id;
    console.log("Current tab ID is: " + currentTabId);
    openTargetSite(sites, keyword.trim(), currentTabId);
  });
});

chrome.runtime.onMessage.addListener(async function(message, sender, sendResponse) {
  sendResponse({ message: "received {message.action}"});
  if (message.action === "save_url") {
    let sitemapText = await loadSiteMapFromStorage();
    sitemapText += "\n#" + message.title;
    sitemapText += "\n" + message.shortcut +" "+message.url;
    saveSiteMapToStorage(sitemapText);
    sites = buildSiteMap(sitemapText);
    console.log("Save new url successfully");
    sendResponse({ message: "received at background" });
  } else if (message.action === "save_sitemap") {
    sites = buildSiteMap(message.sitemapText);
    saveSiteMapToStorage(message.sitemapText)
    console.log("Sites are saved & updated from Option");
  } else if (message.action === "get_sitemap") {
    sendResponse({ message: "Received"});
    sendSiteMapBackToCaller();
  }
});

async function sendSiteMapBackToCaller() {
     let sitemapText = await loadSiteMapFromStorage();
     chrome.runtime.sendMessage({ action: "send_sitemap", sitemapText}, () => {
        console.log("Sent sitemap");
     });
}

async function buildSiteMapFromStorage() {
   let sitemapText = await loadSiteMapFromStorage();
   if (sitemapText == undefined || sitemapText.length == 0) {
       sitemapText = await loadSiteMapFromFile();
       console.log("Sitemap load from file: " + sitemapText.length);
       //Add option shortcut for this extension
       let option = "option "+optionUrl;
       sitemapText += "\n" + option;
       saveSiteMapToStorage(sitemapText);
   }
   console.log("Build site map");
   sites = buildSiteMap(sitemapText);
}

chrome.runtime.onInstalled.addListener(async (details) => {
  buildSiteMapFromStorage();
  if (details.reason === "install") {
      // open the link after installation
      chrome.tabs.create({ url: optionUrl });
    }
});

function buildSiteMap(text) {
    console.log("text content: "+text.length);
    let lines = text.trim().split('\n');
    let _sites = [];
    let _title = "";
    keywords = [];
    for (let i=0;i<lines.length;i++) {
        if (lines[i].indexOf("#") == 0) {
            //Page title
            _title = lines[i].substring(1);
            continue;
        }
        let parts = lines[i].trim().split(' ');
        let _key = parts[0];
        let _url = parts[parts.length-1];
        _sites.push(parts);
        if (_title.length==0) {
            _title = _key;
        } else {
            _title = _key +" -> "+ xmlEncode(_title);
        }
        keywords.push({key: _key, title: _title})
        _title = "";
    }
    return _sites;
}

async function openTargetSite(sites, keyword, tabId) {
    if (sites == undefined || sites.length == 0) {
        console.error("Sites is undefined! - "+sites);
        await buildSiteMapFromStorage();
    }
    for (let i = 0; i < sites.length; i++) {
        if (sites[i] == undefined) {
            console.error("Sites[i] is undefined!");
            continue;
        }
        for (let j = 0; j < sites[i].length-1; j++) {
            if (sites[i][j] == keyword) {
                var url=sites[i][sites[i].length-1];
                console.log(url);
                chrome.tabs.update(tabId, {url: url});
                return
            }
        }
    }
    chrome.tabs.update(tabId, {url: "https://www.google.com/search?q="+keyword});
}