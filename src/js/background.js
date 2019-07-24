// SPDX-License-Identifier: GPL-3.0-or-later

'use strict';

(async function(){

const db = new Dexie('auntietuna');
const manifest = browser.runtime.getManifest();
const storage = browser.storage.local;

// function defs ///////////////////////////////////////////////////////
function onError(error) {
  console.error("[bg]", `${error}`);
}

async function loadHashURL(url) {
  return new Promise(function (resolve, reject) {

    const xhr = new XMLHttpRequest();

    xhr.addEventListener("load", () => {
      console.log("[bg/loadHashURL] status:", xhr.status, "url:", url);
      if(xhr.status == 200) {
        let content = xhr.responseText;
        //console.debug("[bg/loadHashURL] content:", content);
        try {
          var entry = JSON.parse(content);
          //console.debug("[bg/loadHashURL] parsed entry:", entry);
          resolve(entry);
        } catch (exception) {
          console.error("[bg/loadHashURL] couldn't parse json:", exception);
        }
      } else {
        console.error("[bg/loadHashURL] couldn't load", url, "with status:", xhr.status);
      }
    });

    xhr.addEventListener("timeout", () => {
      console.error("[bg/loadHashURL] timed out loading", url);
      resolve(null);
    });

    xhr.onerror = function(e) {
      console.error("[bg/loadHashURL] error when loading", url, e);
      resolve(null);
    };

    xhr.open("GET", url, true);
    xhr.timeout = 2000;
    xhr.send();
  });
}

function handleMessage(request, sender, sendResponse) {
  // who are we getting the message from?
  if (sender.tab != null) {
    console.log("[bg/handleMessage] request from tab", sender.tab.id, ": ", request.action);
  } else {
    console.log("[bg/handleMessage] request:", request.action);
  }

  switch(request.action) {
  case "check_and_recrawl":
    break;
  ////////////////////////////////////
  case "check_hashes":
    break;
  ////////////////////////////////////
  case "dropDb":
    break;
  ////////////////////////////////////
  case "loadDefault":
    break;
  ////////////////////////////////////
  case "log":
    console.log("[bg/handleMessage/log]", request.msg);
    sendResponse({response: ""});
    break;
  ////////////////////////////////////
  case "page_add_hashes":
    break;
  ////////////////////////////////////
  case "redirect":
    break;
  ////////////////////////////////////
  default:
    console.log("[bg/handleMessage] received unknown action:", request.action);
    sendResponse({response: ""});
  }
}
////////////////////////////////////////////////////////////////////////


// entry point /////////////////////////////////////////////////////////

// declare tables, ids and indexes
db.version(1).stores({
  good: '++id, domain, *hashes'
});

// load hashes
// XXX move to function
console.log("[bg] list of WARs to process:", manifest.web_accessible_resources);

let hashes_list = manifest.web_accessible_resources;
let num_hashes = hashes_list.length;

for (const hashes_list_entry of hashes_list) {
  console.log("%c------------------------------------------------------------------------",
    "color:green;");
  console.log("[bg] processing:", hashes_list_entry);

  let hashes_url = browser.runtime.getURL(hashes_list_entry);

  console.log("[bg] getURL:", hashes_url);

  if (/(.json)$/.test(hashes_url)) {

    console.log("[bg] xxx1:", hashes_url);
    let entry = await loadHashURL(hashes_url);
    console.log("[bg] xxx2:", entry);

    // TODO validate entry: { domain: , last_updated: , hashes: }
    if(entry != null) {
      console.log("[bg] xxx3");
      entry.last_updated = (new Date(entry.last_updated)).toJSON();
      console.log("[bg]", entry.last_updated);

      // add entry to db. dupes are allowed here, but to what extent?
      await db.good.add(entry);

      // add domain to whitelist
      storage.get("whitelist").then( items => {
        console.debug("[bg] whitelist:", items["whitelist"]);

        if (items['whitelist'] == null) { items['whitelist'] = []; }
        if (items['whitelist'].constructor === Array) {
          items['whitelist'] = (items['whitelist'].concat(entry.domain)).filter(util.unique);
          storage.set(items).then( () => {
            console.log("[bg] success:", items['whitelist']);
          }, onError);
        }
      }, onError);
    } else {
      // we didn't load anything, so move on
    }
  } else {
    console.log("[bg] ignoring processing:", hashes_list_entry);
  }
} // end for(hashes_list_entry in hashes_list)

// add listener for getting messages from tabs or popup
browser.runtime.onMessage.addListener(handleMessage);

// debugging messages
console.debug(await db.good.toArray());
console.log("[bg] done.");
////////////////////////////////////////////////////////////////////////
})();
