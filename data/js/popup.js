function updateCurrentUrl() {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    var currentUrl = tabs[0].url;
    document.getElementById("current-url").textContent = currentUrl;
    document.getElementById("title-input").value = tabs[0].title;
  });
}

document.addEventListener("DOMContentLoaded", function () {
  updateCurrentUrl();
  document
    .getElementById("shortcut-input")
    .addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        saveUrlWithShortcut();
      }
    });
  document.getElementById("save-button").addEventListener("click", function () {
    saveUrlWithShortcut();
  });
});

function saveUrlWithShortcut() {
  var shortcut = document.getElementById("shortcut-input").value;
  var title = document.getElementById("title-input").value;
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    var url = tabs[0].url;
    chrome.runtime.sendMessage({ action: "save_url", shortcut, title, url }, (response) => {
        console.log("save_url message is sent");
        window.close();
    });
  });
}
