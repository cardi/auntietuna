(function(){ // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Memory_Management

console.log('pb > background begin');

var chrome = self.chrome;
var storage = chrome.storage.local;
// indexedDB
var indexedDB = window.indexedDB || window.webkitIndexedDB || window.msIndexedDB;
var IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange;
var openCopy = indexedDB && indexedDB.open;
var IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction;
if (IDBTransaction) {
  IDBTransaction.READ_WRITE = IDBTransaction.READ_WRITE || 'readwrite';
  IDBTransaction.READ_ONLY = IDBTransaction.READ_ONLY || 'readonly';
}
if (!indexedDB) {
  console.debug("pb > indexedDB unavailable!");
}

var ready = 0;
var num_hashes = 0;
var dict_hashes = {};


// function defs
function loadHashURL(url, callback) {
  var xhr = new XMLHttpRequest();
  xhr.open("GET", url, true);
  xhr.onreadystatechange = function() {
    if (xhr.readyState == 4) {
      if(xhr.status == 200) {
        var content = xhr.responseText;
        var isJson = true;

        // test if JSON, and callback
        try {
          //console.debug("pb loadHashURL() > content: " + content);
          var entry = JSON.parse(content);
          callback(entry);
        } catch (exception) {
          console.debug("pb loadHashURL() > couldn't parse json: " + exception);
          isJson = false;
        }

        // to be deprecated
        if (!isJson) {
          var hashes = [];
          content.split('\n').forEach(function(entry) {
            if(entry.length > 0) {
              hashes.push(entry);
            }
          });
          callback(hashes);
        }
      } else { // status != 200
        console.log('pb error> couldn\'t load ' + url + '. skipping.');
      } // end if/else
    } // end if xhr.readyState
  }
  xhr.send();
}

function loadHashes() {
  // XXX IDEA: load k/v from JSON
  // pull web_accessible_resources from manifest.json
  var manifest = chrome.runtime.getManifest();
  var hashes_list = manifest.web_accessible_resources;
  num_hashes = hashes_list.length;

  console.log('pb background> ' + manifest.web_accessible_resources);

  // iterate through each resource
  hashes_list.forEach(function(hashes_list_entry) {
    // TODO find some thread-safe way (message passing?) that lets us load multiple lists
    // XXX for now, we do the following: load all of this stuff into
    //+memory, concatenate at the very end, then put it in storage

    // http://stackoverflow.com/questions/23270282/how-to-push-multiple-values-to-a-chrome-storage-local-array-key
    // http://stackoverflow.com/questions/15050861/best-way-to-prevent-race-condition-in-multiple-chrome-storage-api-calls
    // http://stackoverflow.com/questions/28009163/thread-safe-adding-records-to-chrome-storage-local?lq=1

    var hashes_url = chrome.extension.getURL(hashes_list_entry);
    console.log('pb background> load hashes: ' + hashes_url);

    if (/(.json)$/.test(hashes_url)) {
      loadHashURL(hashes_url, function(entry) {

        if (db == null) {
          console.log("pb loadHashes() > db is null!");
        }

        var tx = db.transaction(["known_good"], "readwrite");
        tx.oncomplete = function(e) {
          console.log("pb loadHashes() json db > done!")
        }

        var store = tx.objectStore("known_good");
        // TODO validate entry: { domain: , last_updated: , hashes: }
        // then generate bloom filter?
        entry.last_updated = (new Date(entry.last_updated)).toJSON();

        console.debug("pb loadHashes json db > " + entry.domain);
        store.put(entry);

        // add site to whitelist
        storage.get("whitelist", function(obj) {
          console.debug("pb loadHashes get > " + obj['whitelist']);
          if (obj['whitelist'] == null) {
            obj['whitelist'] = [];
          }
          if (obj['whitelist'].constructor === Array) {
            obj['whitelist'] = (obj['whitelist'].concat(entry.domain)).filter(onlyUnique);
            storage.set(obj, function() {
              if(chrome.runtime.lastError) {
                console.log("pb loadHashes set > ERROR: " + chrome.runtime.lastError.message);
              } else {
                console.debug("pb loadHashes set > successful: " + obj['whitelist']);
              }
            });
          }
        });
      });
    } else {
      // load the hash into a variable
      // at the end of each callback, check if dict.keys() == num_hashes,
      // and put it in storage

      // XXX not sure if this is done in serial due to some async
      // requests, but just in case
      loadHashURL(hashes_url, function(hashes) {
        console.log('pb background debug> ready: ' + ready
          + ', dict entries: ' + Object.keys(dict_hashes).length);

        ready = ready + 1;
        dict_hashes[hashes_url] = hashes;

        if(Object.keys(dict_hashes).length == num_hashes) {
          // now we can load all the keys into storage
          //  do this as one monolithic key/value pair
          // TODO find a better way to do this

          // an array of arrays
          var values = Object.keys(dict_hashes).map(function(key){
            return dict_hashes[key];
          });

          // flatten values array
          var result = Array.prototype.concat.apply([], values);

          // store data into storage
          var obj = {};
          obj['hashes'] = result;
          obj['whitelist'] = ['www.paypal.com', 'www.isi.edu'];
          obj['ready'] = 1;

          // TODO set callback to check success/failure
          storage.set(obj, function setReady() {
            // Callback on success, or on failure (in which case runtime.lastError will be set).
            ready = 1;
            console.log('pb background> list of hashes loaded into storage ready? ' + ready);

            console.log('pb background debug> ready: ' + ready
              + ', dict entries: ' + obj['hashes'].length);
          });
        }
      });
    }

  }); //*/

  /*// singular load of hashes from the first entry in web_accessible_resources
  var hashes_url = chrome.extension.getURL(hashes_list[0]);
  console.log('pb background> load hashes: ' + hashes_url);

  var xhr = new XMLHttpRequest();
  xhr.open("GET", hashes_url, true);
  xhr.onreadystatechange = function() {
    if (xhr.readyState == 4) {
      var content = xhr.responseText;

      var bad = [];
      content.split('\n').forEach(function(entry) {
        bad.push(entry);
      });

      var obj = {};
      obj['hashes'] = bad;
      obj['ready'] = 1;

      // TODO set callback to check success/failure
      storage.set(obj, function setReady() {
        // Callback on success, or on failure (in which case runtime.lastError will be set).
        ready = 1;
        console.log('pb background> ready? ' + ready);
      });
    }
  }
  xhr.send(); //*/
}

// main execution
//storage.getBytesInUse('hashes', function(bytes) {
//  console.log('pb background> storage bytes used: ' + bytes);
//  // XXX for debugging purposes, we can reset the storage and load everything
//  // back in.  in the future, we need a smarter way of managing the cache
//  // (e.g., see ublock).
//  if (bytes > 0) {
//    /*storage.clear(function() {
//      console.log('pb background> storage reset and cleared');
//      loadHashes();
//    });//*/
//  }//*/
//  else {
//    console.log('storage> bytes of _hashes_ == 0, loading hashes');
//    loadHashes();
//  }
//});

// 2016-01-06 indexedDB
const dbName = "auntie_tuna";
const dbVer  = 1;
var db = null;

// 2016-01-11 for debugging
var dropDatabase = function(name)
{
  var request = indexedDB.deleteDatabase(name);
  request.onsuccess = function() { console.log("pb > drop succeeded"); };
  request.onerror = function() { /* drop failed */ };
};
//dropDatabase(dbName);

var request = indexedDB.open(dbName, dbVer);
request.onerror = function(event) {
  console.log("pb db > error opening db: " + event.target.errorCode)
};
request.onsuccess = function(event) {
  console.log("pb db > onsuccess");
  db = event.target.result;
}

request.onupgradeneeded = function(event) {
  console.log("pb db > onupgradeneeded");

  // event is an instance of IDBVersionChangeEvent
  var db = event.target.result;
  if (db.objectStoreNames.contains('known_good')) {
    db.deleteObjectStore('known_good');
  }

  var store = db.createObjectStore('known_good', { keyPath: "domain" });

  // create indexes
  var domainIndex = store.createIndex("domain", "domain", {unique: true});
  var hashesIndex = store.createIndex("hashes", "hashes", {unique: false, multiEntry: true});

  // wait for txn to complete before adding data
  loadHashes();
  /*store.transaction.oncomplete = function(event) {
    var kg_store = db.transaction("known_good", "readwrite").objectStore("known_good");
  };/*/
}

// debug
/*indexedDB.webkitGetDatabaseNames().onsuccess = function(e) {
    for (var i = 0, l = e.target.result.length; i < l; i++)
        console.debug('pb > ' + e.target.result[i]);
};//*/

// http://stackoverflow.com/questions/1960473/unique-values-in-an-array
function onlyUnique(value, index, self) {
  return self.indexOf(value) === index;
}

// listener for getting messages from either tab or popup
chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    //console.log(sender);
    //console.log(request);
    if (sender.tab != null) {
      console.log('pb addListener > request from tab ' + sender.tab.id + ': ' + request.action);
    } else {
      console.log('pb addListener > request: ' + request.action);
    }
    if(request.action == 'log') {
      console.log('pb addListener > request: ' + request.msg);
      sendResponse({msg: 'ok'});
    } // end 'log'
    else if(request.action == 'check_and_recrawl') {

      console.log('pb addListener recrawl > check and recrawl from ' + request.domain);
      var domain = request.domain;

      var tx = db.transaction(["known_good"], "readonly");
      tx.onerror = function(event) {
        console.log("pb recrawl > error opening tx: " + event.target.errorCode)
      };
      tx.oncomplete = function(e) {
        console.log("pb recrawl > done!")
      }
      var store = tx.objectStore("known_good");
      var idx = store.index("domain");

      var request = idx.get(domain);
      var last_updated = null;
      request.onerror = function(event) {
        console.log("pb recrawl > error opening db: " + event.target.errorCode);
        sendResponse({msg: 'error'});
      };
      request.onsuccess = function() {
        var entry = request.result;
        if (entry !== undefined) {
          last_updated = entry.last_updated;
          console.debug("pb recrawl > last_updated: " + last_updated);
        } else {
          console.log("pb recrawl > should never get here!");
        }
        sendResponse({msg: last_updated});
      }
      return true; // keep channel open because we return async
    } // end 'check_and_recrawl'
    else if(request.action == 'check_hashes') {
      console.log('pb check_hashes > recv');
      //console.debug(request.hashes);
      var tx = db.transaction("known_good", "readonly");
      tx.oncomplete = function(e) {
        console.log("pb check_hashes > done!")
      }
      var idx = tx.objectStore("known_good").index("hashes");

      // inefficient cursor use due to async
      var matches = 0;
      var domains = {};
      idx.openCursor().onsuccess = function(event) {
        var cursor = event.target.result;
        if (cursor) {
          if ( (request.hashes).indexOf(cursor.key) != -1 ) {
            matches = matches + 1;
            if (domains[cursor.value.domain] == null) {
              domains[cursor.value.domain] = 1;
            } else {
              domains[cursor.value.domain] = domains[cursor.value.domain] + 1;
            }
          }
          //console.log((request.hashes).indexOf(cursor.key) + " " + matches + " " + cursor.value.domain);
          cursor.continue();
        } else {
          // no more matching records
          sendResponse({matches: matches, domains: domains});
        }
      };
      return true;
    } // end 'check_hashes'
    else if(request.action == 'redirect') {
      console.log('pb redirect > req from ' + sender.tab.url + ' to: ' + request.msg);
      // process redirect request
      var tabId = sender.tab.id;
      var redirectUrl = request.msg;

      if(redirectUrl.startsWith('chrome-extension://') == true) {
        chrome.tabs.update(tabId, {url: redirectUrl}, function() {
          if(chrome.runtime.lastError) {
            console.log("pb redirect > error in action = 'redirect'");
          }
        });
      } else {
        // do nothing
      }
    } // end 'redirect'
    else if(request.action == 'page_add_hashes') {
      console.log('pb page_add_hashes > adding new hashes to known good');
      console.log(request);

      var tx = db.transaction(["known_good"], "readwrite");
      tx.oncomplete = function(e) {
        console.log("pb page_add_hashes > done!")
        sendResponse({msg: 'ok'});
      }

      var store = tx.objectStore("known_good");
      var db_request = store.get(request.domain);
      db_request.onerror = function(e) {
        console.log("pb page_add_hashes > error: " + e.target.errorCode)
      }
      db_request.onsuccess = function(e) {
        var data = e.target.result;
        //var entry = {}
        if (data == null) {
          console.log("pb page_add_hashes > adding new entry");
          data = {
            domain: request.domain,
            last_updated: (new Date(request.last_updated)).toJSON(),
            hashes: request.hashes
          }

          // add to whitelist
          storage.get('whitelist', function(items) {
            items['whitelist'] = (items['whitelist'].concat([request.domain])).filter(onlyUnique);
            storage.set(items, function() {
              if(chrome.runtime.lastError) {
                console.log("pb page_add_hashes whitelist > ERROR: " + chrome.runtime.lastError.message);
              }
            });
          }); // end add to whitelist
        } else {
          console.log("pb page_add_hashes > before:");
          console.log(data);

          data.last_updated = (new Date(request.last_updated)).toJSON();
          data.hashes = (data.hashes).concat(request.hashes);
        }

        var db_request_update = store.put(data);
        db_request_update.onerror = function(e) {
          console.log("pb page_add_hashes db_request_update > error: " + e.target.errorCode)
        }
        db_request_update.onsuccess = function(e) {
          console.log("pb page_add_hashes db_request_update > sucessfully updated entry");
          console.debug(data);
        }
      }

      return true;
    } // end 'page_add_hashes'
    else if(request.action == 'loadDefault') {
      // this is sent from the options.html page
      console.log('msg> got a loadDefault message');
      loadHashes();
      sendResponse({msg: 'ok'});
    } // end 'loadDefault'
    else if(request.action == 'dropDb') {
      console.log('pb dropDb > dropping the database');
      dropDatabase(dbName);
      sendResponse({msg: 'ok'});
    } // end 'dropDb'
    else {
      console.log('pb listener > received unknown action');
    }
});

console.log('pb background > end');

})();
