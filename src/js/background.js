// SPDX-License-Identifier: GPL-3.0-or-later

'use strict';

import {db, testExportText} from '/js/db.js';

(async function(){

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

async function loadHashURLList(urls) {
  // TODO better error handling
  for (let i=0; i<urls.length; i++) {
    console.log("%c------------------------------------ ", "color:green;");

    let hashes_url = urls[i];

    console.debug("[bg/loadHashURLList] processing URL:", hashes_url);
    let entry = await loadHashURL(hashes_url);
    console.log("[bg/loadHashURLList] entry from URL:", entry);

    // TODO validate entry: { domain: , last_updated: , hashes: }
    if(entry != null) {
      entry.last_updated = (new Date(entry.last_updated)).toJSON();
      entry.imported = (new Date()).toJSON();

      // add entry to db. dupes are allowed here, but to what extent?
      await db.good.add(entry);

      // add domain to whitelist
      storage.get("whitelist").then( items => {
        console.debug("[bg] whitelist [1]:", items["whitelist"]);

        if (items['whitelist'] == null) { items['whitelist'] = []; }
        if (items['whitelist'].constructor === Array) {
          items['whitelist'] = (items['whitelist'].concat(entry.domain)).filter(util.unique);
          storage.set(items).then( () => {
            console.debug("[bg] whitelist [2]:", items['whitelist']);
          }, onError);
        }
      }, onError);
    } else {
      // we didn't load anything, so move on
    }

    // we're done with this object
    window.URL.revokeObjectURL(urls[i]);
  }

  return;
}

async function handleMessage(request, sender, sendResponse) {
  // who are we getting the message from?
  if (sender.tab != null) {
    console.log("[bg/handleMessage] request from tab", sender.tab.id, ":", request.action);
  } else {
    console.log("[bg/handleMessage] request:", request.action);
  }

  switch(request.action) {
  case "check_and_recrawl":
    break;
  ////////////////////////////////////
  case "check_hashes":
    console.log("[bg/handleMessage/check_hashes] received");
    console.debug("[bg/handleMessage/check_hashes] dom_hashes", request.hashes);

    // return (known good entries) where (any entry inside `request.hashes`)
    // exists in the `hashes` of the (known good entries)
    const result = await db.good.where('hashes').anyOf(request.hashes).distinct().toArray();
    //console.debug("db result:", result);

    // build an array of matches for debugging
    let matches = []
    for (const entry of result) {
      let matchesEntry = {
         'domain'        : entry.domain
        ,'last_updated'  : entry.last_updated
        ,'imported'      : entry.imported
        ,'id'            : entry.id
        ,'numMatches'    : 0
        ,'matchedHashes' : []
        }

      // compute which hashes in `request.hashes` matched with `knownGoodEntry.hashes`
     const intersection = entry.hashes.filter(value => request.hashes.includes(value));

      matchesEntry.matchedHashes = intersection;
      matchesEntry.numMatches = intersection.length;

      matches.push(matchesEntry);
    }
    console.debug("xxx:", matches);

    let numberSubmittedHashes = request.hashes.length;

    // find how many total distinct matches across the hashes of all known good entries
    let allHashes = result.map(entry => entry.hashes);
    let mergedAllHashes = [].concat.apply([], allHashes);
    console.debug("xxx2:", mergedAllHashes);
    const intersection = request.hashes.filter(value => mergedAllHashes.includes(value));
    let numberMatchedHashes = intersection.length;
    console.debug("xxx3:", numberMatchedHashes);

    let uniqueDomains = new Set(result.map(entry => entry.domain));
    console.debug("uniqueDomains:", uniqueDomains);

    let numberMatchedDomains = uniqueDomains.size;
    console.debug("numberMatchedDomains:", numberMatchedDomains);

    //  for each hash:
    //    what domains (+dates?) does it show up in?
    //      debug[hash] += domain+date (for our debugging purposes)
    //    increment counter += 1
    //  return { domains: domains, matches: counter, debug: debug }

    // number of submitted hashes
    // number of matched hashes (total)
    // number of matched domains (total)
    // debug:
    //  for each domain, how many matched hashes?

    let response =
      {
        response                 : "ok"
        ,number_submitted_hashes : numberSubmittedHashes
        ,number_matched_hashes   : numberMatchedHashes
        ,number_matched_domains  : numberMatchedDomains
      };
    return new Promise(resolve => resolve(response));
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
    //sendResponse({response: ""});
    return new Promise(resolve => resolve({response: "ok"}));
    break;
  ////////////////////////////////////
  case "options_import_hashes":
    console.log("[bg/handleMessage/options_import_hashes]", request);
    // sanity check
    if (Array.isArray(request.files) && request.files.length > 0) {
      await loadHashURLList(request.files);
    } else {
      console.debug("[bg/handleMessage/options_import_hashes] files is not an array or empty");
    }
    return new Promise(resolve => resolve({response: "ok"}));
    break;
  ////////////////////////////////////
  case "page_add_hashes":
    console.debug("[bg/handleMessage/page_add_hashes]", request);
    return new Promise(resolve => resolve({response: "not implemented"}));
    break;
  ////////////////////////////////////
  case "redirect":
    break;
  ////////////////////////////////////
  case "echo":
    console.log("[bg/handleMessage/echo] echo requested:", request.msg);
    //sendResponse({response: request.msg});
    return new Promise(resolve => resolve({response: request.msg}));
    break;
  ////////////////////////////////////
  default:
    console.log("[bg/handleMessage] received unknown action:", request.action);
    //sendResponse({response: ""});
    return new Promise(resolve => resolve({response: ""}));
  }
}
////////////////////////////////////////////////////////////////////////


// entry point /////////////////////////////////////////////////////////

// if db is empty, load hashes from WARs to db
db.on('ready', () => {
  return db.good.count( (count) => {
    if (count > 0) {
      console.log("[bg] db already has count of", count);
    } else {
      console.log("[bg] db is empty, populating with WARs");
      console.log("[bg] list of WARs to process:", manifest.web_accessible_resources);

      let hashes_list = [];
      for (const hashes_list_entry of manifest.web_accessible_resources) {
        let hashes_url = browser.runtime.getURL(hashes_list_entry);
        if (/(.json)$/.test(hashes_url)) {
          hashes_list.push(hashes_url);
        } else {
          console.log("[bg] ignoring processing:", hashes_list_entry);
        }
      }

      if (hashes_list.length > 0) {
        loadHashURLList(hashes_list);
      }
    }
  });
});

// add listener for getting messages from tabs or popup
browser.runtime.onMessage.addListener(handleMessage);

// debugging messages
//console.debug(await db.good.toArray());
let openPreferencesPage = browser.tabs.create({
                            url: browser.runtime.getURL("options.html")
                          });
openPreferencesPage.then(tab => { console.log("[bg] opened", tab.id) }, onError);

// test module import
console.log("[bg] testing imported variable:", testExportText);
console.assert("lorem ipsum" == testExportText, { textExportText: testExportText } );
/////////////////////

console.log("[bg] done.");
////////////////////////////////////////////////////////////////////////
})();
