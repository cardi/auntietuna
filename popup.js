function getCurrentTab(callback) {
  var queryInfo = {
    active: true,
    currentWindow: true
  };

  chrome.tabs.query(queryInfo, function(tabs) {
    var tab = tabs[0];
    console.assert(typeof tab.url == 'string', 'tab.url should be a string');
    callback(tab);
  });
}

function renderStatus(statusText) {
  document.getElementById('status').textContent = statusText;
}

function sendBgMessage(message) {
  chrome.runtime.sendMessage(
    {
      action: 'log',
      msg: message
    }, 
    function(response) { }
  );//*/
}

// TODO this does not like file:///
function downloadHashes(addToStorage) {
  console.assert(typeof addToStorage == 'boolean', 'addToStorage should be a boolean');

  if (addToStorage == false) {
    renderStatus("downloading hashes.");
  } else if (addToStorage = true) {
    renderStatus("adding hashes and site to whitelist.");
  }

  // get the current tab ID to send the right message to
  getCurrentTab(function(tab) {
    sendBgMessage("from: " + tab.id + " url: " + tab.url); 
    console.log('current tab id is ' + tab.id);
    chrome.tabs.sendMessage(
      tab.id,
      { action: 'log', msg: 'hello from ' + document.location.href },
      function(response) { console.log("sent hello, got back: " + response.msg); }
    );

    // send request for the DOM
    chrome.tabs.sendMessage(
      tab.id, 
      { action: 'request_dom' },
      function(response) { 
        console.log('response> ' + response);
        if(response.lastError) {
          console.log('error> ' + response.lastError);
        } else {
          // we're successful and we have the hashes
          console.log('msg> ' + response.msg); 

          var data = {
            domain: response.domain,
            last_updated: (new Date(response.last_updated)).toJSON(),
            hashes: response.hashes 
          }
          console.log(data);

          var blob = new Blob([JSON.stringify(data)],
                              {type: "application/json;charset=utf-8"});
          
          if(addToStorage == false) {
            // now package it up and download it to a file
            var fn_results = "hashes." + data.domain + "." + data.last_updated + ".json";
            sendBgMessage("saving hashes to " + fn_results);
            // FileSaver saveAs(Blob data, DOMString filename, optional Boolean disableAutoBOM)
            saveAs(blob, fn_results, true); // don't want BOM (byte order mark)
            renderStatus("hashes downloaded.");
          } 
          else if(addToStorage == true) {
            // we want to add this to our indexedDB

            // provide the option to have it downloaded, if needed:
            var url = window.URL.createObjectURL(blob);
            //sendBgMessage("blob url: " + url); 

            // test that we can download text
            var a = document.createElement("a");
            var b = document.createTextNode("Download"); 
            a.appendChild(b);
            document.body.appendChild(a);
            a.href = url;
            a.download = "hashes." + data.domain + "." + data.last_updated + ".json";

            // TODO once clicked, tear down URL?
            //window.URL.revokeObjectURL(url);

            // now send the JSON to background.js to be added
            // TODO inefficient--we could probably have the tab's content-script do this
            data['action'] = 'page_add_hashes';
            chrome.runtime.sendMessage(
              data,
              function(response) {
                console.log("pb popup page_add_hashes > resp: " + response.msg);
              });
          } else {
            // should never get here
          }
        }
      });
  });
}

// this is torn down and brought up each time the button is clicked.
document.addEventListener('DOMContentLoaded', function() {
  console.log("button> domcontent loaded");
  sendBgMessage("button pressed.")
  renderStatus("all systems go.");
});

// user clicks on "add" button
// this adds the hashes of all chunks of the active page to localStorage
// we need to have a way to backup all the hashes.
document.getElementById('add').addEventListener('click', function() { downloadHashes(true); });

// user clicks on "download" button
// this downloads a plaintext copy of hashes of all chunks of the active page
document.getElementById('dl').addEventListener('click', function() { downloadHashes(false); });
