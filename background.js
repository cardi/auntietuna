(function(){ // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Memory_Management

console.log('pb background> begin');

var chrome = self.chrome;
var storage = chrome.storage.local;
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
        var hashes = [];
        content.split('\n').forEach(function(entry) {
          if(entry.length > 0) {
            hashes.push(entry);
          }
        });
        callback(hashes);
      } else { // status != 200
        console.log('pb error> couldn\'t load ' + url + '. skipping.');
      } // end if/else
    } // end if xhr.readyState
  }
  xhr.send(); 
}

function loadHashes() {

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
        obj['ready'] = 1;

        // TODO set callback to check success/failure
        storage.set(obj, function setReady() {
          // Callback on success, or on failure (in which case runtime.lastError will be set).
          ready = 1;
          console.log('pb background> list of hashes loaded into storage ready? ' + ready);
        });
      }
    });    

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
storage.getBytesInUse(null, function displayBytes(bytes) {
  console.log('pb background> storage bytes used: ' + bytes);

  // for debugging purposes, we reset the storage and load everything back in.
  // in the future, we need a smarter way of managing the cache (e.g., see ublock).
  if (bytes > 0) {
    storage.clear(function() {
      console.log('pb background> storage reset and cleared');
      loadHashes();    
    });
  } 
  else {
    loadHashes();
  }
});

console.log('pb background> end');

})();
