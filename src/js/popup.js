// SPDX-License-Identifier: GPL-3.0-or-later

'use strict';

(async function(){

// global variables
let storage = browser.storage.local;

// function defs
function onError(error) {
  console.error("[popup]", `${error}`);
}

async function getCurrentTab() {
  const queryInfo = {
    active: true,
    currentWindow: true
  };

  let tabs = await browser.tabs.query(queryInfo);
  let tab = tabs[0];
  console.assert(typeof tab.url == 'string', 'tab.url should be a string');

  //console.debug("tab", tab);

  return tab;
}

function sendBgMessage(message) {
  let msg = browser.runtime.sendMessage({
      action: 'log',
      msg: message
  });

  msg.then( response => {
    console.log("[popup/sendBgMessage] response:", response);
  });
}

async function downloadHashes(addToStorage) {
  console.assert(typeof addToStorage == 'boolean', 'addToStorage should be a boolean');

  if (addToStorage == false) {
    renderStatus("downloading hashes.");
  } else if (addToStorage == true) {
    renderStatus("adding hashes and site to whitelist.");
  }

  // TODO do nothing if we're on special URLs (file:///, // moz-extension://, etc)
  let tab = await getCurrentTab();
  if (typeof tab === 'undefined' || tab === null) {
    return;
  }

  sendBgMessage("from: " + tab.id + " url: " + tab.url);
  console.log('[popup/download] current tab id is', tab.id);

  // DEBUG: sent a test message to tab:contentscript
  let testMsg = browser.tabs.sendMessage(tab.id,
    { action: 'log', msg: 'hello from ' + document.location.href }
  );
  testMsg.then( (resp) => {
    console.log("[popup/testmsg] sent hello, got back:", resp.response);
  })

  // send a request for the page's hashes to tab:content script
  let domRequestMsg = browser.tabs.sendMessage(tab.id,
    { action: 'request_dom' });
  domRequestMsg.then( (resp) => {
    let data = {
      domain       : resp.domain,
      last_updated : (new Date(resp.last_updated)).toJSON(),
      hashes       : resp.hashes
    }
    console.log("[popup/domRequest] returned data:", data);

    // build json blob for saving
    let blob = new Blob([JSON.stringify(data)], {type: "application/json;charset=utf-8"});

    // build filename
    let date = new Date();
    let url = window.URL.createObjectURL(blob);
    let name = `hashes-${date.toJSON()}.json`;

    console.log("[popup/exportHashes]", "filename:", name, "url:", url);

    if (addToStorage == false) {
      // download blob: use FileSaver to save file
      saveAs(blob, name);
    } else {
      // send blob URL to background to be added
      var msgSendImport = browser.runtime.sendMessage({
                          action: 'options_import_hashes',
                          files: [url]
                        });

      // process response
      msgSendImport.then( msgResp => {
        console.log("[popup/msgSendImport] response from background:", msgResp.response);
        renderStatus("page added.");
      });
    }
  });

  return;
}

////////////////////////////////////////////////////////////////////////
// function defs for UI elements ///////////////////////////////////////

function renderStatus(statusText) {
  document.getElementById('status').textContent = statusText;
}

////////////////////////////////////////////////////////////////////////
// entry point /////////////////////////////////////////////////////////

// enable debug button
storage.get("debug").then( (result) => {
  if("debug" in result) {
    if(result.debug === true) {
      document.getElementById('download').style.display = "block";
    }
  }
}, onError);

// add event listeners to popup.html

// add button: adds hashed chunks to db, domain to whitelist
document.getElementById('add')
        .addEventListener('click', () => { downloadHashes(true); });

// download button: downloads .json of hashed chunks of active page
document.getElementById('download')
        .addEventListener('click', () => { downloadHashes(false) });

// options button: open `options.html` in a new tab (instead of new window)
document.getElementById('options')
        .addEventListener('click', () => { browser.tabs.create({url: "options.html"}); });

renderStatus("ok.");
////////////////////////////////////////////////////////////////////////
})();
