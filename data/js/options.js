function getOptionFromStorage(reuseTabSwitch) {
  chrome.storage.sync.get('option', (result) => {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError);
        } else {
          if (result.option === undefined) {
              console.error("Not found option in storage");
          } else {
            option = result.option;
            reuseTabSwitch.checked = option.reuseTab;
          }
        }
      });
}

function saveOptionToStorage(option) {
  chrome.storage.sync.set({ option: option });
}

document.addEventListener('DOMContentLoaded', function() {
 let data = [];
 let unsavedChanges = false;
 let option = {};
 const saveButton = document.getElementById("save-button");
   const reuseTabSwitch = document.getElementById('reuseTabSwitch');
   getOptionFromStorage(reuseTabSwitch);
   reuseTabSwitch.addEventListener('change', function() {
       var isEnabled = reuseTabSwitch.checked;
       option.reuseTab = isEnabled;
       saveOptionToStorage(option);
       chrome.runtime.sendMessage({ action: "update_option"}, (response) => {});
     });

   chrome.runtime.sendMessage({ action: "get_sitemap"}, (response) => {
       deserializeData(response.message)
    });

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "send_sitemap") {
       deserializeData(message.sitemapText)
       console.log("[Option] Site map received");
    }
  })

  saveButton.addEventListener("click", function () {
      var sitemapText = serializeTable();
      chrome.runtime.sendMessage({ action: "save_sitemap", sitemapText}, () => {
          console.log("[Option] save_sitemap message is sent");
          alert("Data is saved successfully")
          unsavedChanges = false;
          generateTableRows();
      });
  });

    // Event listener for keydown event
    document.addEventListener('keydown', function (event) {
      // Check if the Control key and the "S" key are pressed
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        // Trigger the save button action
        saveButton.click();
        event.preventDefault(); // Prevent the default browser behavior (e.g., save the page)
      }
    });

  // Event listener for beforeunload event
  window.addEventListener('beforeunload', function (event) {
    if (unsavedChanges) {
      // Show prompt only if there are unsaved changes
      event.preventDefault();
      event.returnValue = ''; // Required for modern browsers to show the prompt
    }
  });

  /*****************/
  // Function to deserialize the string into the data table
  function deserializeData(string) {
    // Clear existing data
    data = [];

    // Split the string into lines
    const lines = string.split('\n');

    // Iterate over each line
    for (let i = 0; i < lines.length; i += 1) {
      let title = "";
      if (lines[i].indexOf("#") == 0) {
        title = lines[i].substring(1); // Remove the "#" character
        i++; // Move to the next line
      }
      const [keyword, url] = lines[i].split(' ');
      if (keyword === undefined || keyword === '') continue;

      // Create a new data object
      const newData = {
        keyword: keyword,
        title: title,
        url: url
      };

      // Add the new data object to the array
      data.push(newData);
    }
    data = data.sort((a, b) => a.keyword.localeCompare(b.keyword));
    // Refresh the table
    generateTableRows();
  }
    // Function to generate the table rows
    function generateTableRows() {
      const tableBody = document.querySelector('tbody');

      // Clear existing rows
      tableBody.innerHTML = '';

      // Generate new rows
      data.forEach((row, index) => {
        const newRow = document.createElement('tr');
        newRow.innerHTML = `
          <td>${index+1}</td>
          <td contenteditable="true" data-field="keyword">${row.keyword}</td>
          <td contenteditable="true" data-field="title">${row.title}</td>
          <td contenteditable="true" data-field="url">${row.url}</td>
          <td>
            <i class="fas fa-trash delete-icon" data-index="${index}"></i>
          </td>
        `;
        tableBody.appendChild(newRow);
      });

      // Attach event listeners to the editable cells
      const editableCells = document.querySelectorAll('[contenteditable="true"]');
      editableCells.forEach(cell => {
        cell.addEventListener('input', updateCellData);
      });

      // Attach event listener to the delete icons
      const deleteIcons = document.querySelectorAll('.delete-icon');
      deleteIcons.forEach(icon => {
        icon.addEventListener('click', deleteRow);
      });
    }

    // Function to handle cell data updates
    function updateCellData(event) {
      const field = event.target.dataset.field;
      const index = event.target.parentNode.rowIndex - 1; // Adjusting for the table header
      const value = event.target.innerText;

      // Update the corresponding data in the array
      data[index][field] = value;

      // Highlight the row if its data was updated
      const row = event.target.parentNode;
      row.style.backgroundColor='#ffe0b2';
      unsavedChanges = true;
    }

    // Function to handle row deletions
    function deleteRow(event) {
      const index = event.target.dataset.index;

      // Remove the corresponding data from the array
      data.splice(index, 1);

      // Re-generate the table rows
      generateTableRows();
    }

    // Function to serialize the table data to a formatted string
    function serializeTable() {
      let serializedTable = '';

      data.forEach(row => {
        serializedTable += `#${row.title}\n${row.keyword} ${row.url}\n`;
      });

      return serializedTable;
    }

    // Export serialized data as a file
    function exportData() {
      const serializedData = data
        .map(item => `#${item.title}\n${item.keyword} ${item.url}`)
        .join('\n\n');

      const element = document.createElement('a');
      const file = new Blob([serializedData], { type: 'text/plain' });
      element.href = URL.createObjectURL(file);
      element.download = 'data.txt';
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    }

    // Event listener for export button
    const exportButton = document.getElementById('export-button');
    exportButton.addEventListener('click', exportData);

    // Import data from a file
    function importData(file) {
      const reader = new FileReader();
      reader.onload = function (e) {
        const content = e.target.result;
        deserializeData(content);
      };
      reader.readAsText(file);
    }

    // Event listener for import button
    const importButton = document.getElementById('import-button');
    importButton.addEventListener('click', function () {
      const fileInput = document.getElementById('import-file');
      fileInput.click();
    });

    // Event listener for file input change
    const fileInput = document.getElementById('import-file');
    fileInput.addEventListener('change', function (event) {
      const file = event.target.files[0];
      if (file) {
        importData(file);
      }
    });
});