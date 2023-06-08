var readmeUrl = "README.md"; // Replace with the path to your README file
var readmeRequest = new XMLHttpRequest();
readmeRequest.open("GET", readmeUrl, true);
readmeRequest.onload = function() {
  if (readmeRequest.status === 200) {
    var readmeText = readmeRequest.responseText;
    var readmeHtml = marked.parse(readmeText);
    document.getElementById("readme").innerHTML = readmeHtml;
  }
};
readmeRequest.send();