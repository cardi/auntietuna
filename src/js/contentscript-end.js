function checkHash(hash) {
  if(obj['hashes'] != null) {
    if(obj['hashes'].indexOf(hash.toString()) != -1) {
      // hash exists on the bad list
      return 1;
    } else {
      return 0;
    }
  } else {
    console.log("pb checkHash > obj[hashes] is null");
  }
}

// XXX should we really keep passing around content like this? should probably
// check if javascript does pass by reference or...?
// TODO should validate regex
// TODO it would be awesome to put a red border around matches!
function chunkAndCheck(regex, content) {

  var m = '';
  var pos_list = [0];
  
  do {
    m = regex.exec(content);
    if (m) {
      //console.log(m['index']);
      pos_list.push(m['index']);
    }
  } while (m);
  
  pos_list.push(content.length);
  
  //console.log(pos_list);
  
  var pos_tuples_list = [];
  
  for( var i = 0; i < pos_list.length - 1; i++ ) {
    pos_tuples_list.push( [ pos_list[i], pos_list[i+1] ] );
  }
  
  //console.log(pos_tuples_list);

  var bad = 0;
  var total = 0;
  
  pos_tuples_list.forEach(function(tuple) {
    var b = tuple[0];
    var e = tuple[1];

    // only do this for chunk sizes >= 25 otherwise we will get
    // tons of false positives
    if((e - b + 1) < 25) { return; }

    var h = CryptoJS.SHA256( content.substring(b,e) );

    var res = checkHash(h);
    if(res == 1) {
      bad = bad + 1;
    } 
    total = total + 1;
    
    if (debug === 1 ) { 
      console.log("pb chunkAndHash > " + tuple + " " + res + " " + h.toString().substring(0,10));
    }
  });

  return { 'bad' : bad, 'total' : total };
}

function chunkAndHash(regex, content) {

  var m = '';
  var pos_list = [0];
  
  do {
    m = regex.exec(content);
    if (m) {
      //console.log(m['index']);
      pos_list.push(m['index']);
    }
  } while (m);
  
  pos_list.push(content.length);
  
  //console.log(pos_list);
  
  var pos_tuples_list = [];
  
  for( var i = 0; i < pos_list.length - 1; i++ ) {
    pos_tuples_list.push( [ pos_list[i], pos_list[i+1] ] );
  }
  
  //console.log(pos_tuples_list);

  var hash_vector = [];

  pos_tuples_list.forEach(function(tuple) {
    var b = tuple[0];
    var e = tuple[1];

    // only do this for chunk sizes >= 25 otherwise we will get
    // tons of false positives
    if((e - b + 1) < 25) { return; }

    var h = CryptoJS.SHA256( content.substring(b,e) );

    hash_vector.push(h.toString(CryptoJS.enc.Hex));
    //console.log(h + " " + content.substring(b,e)); 
  });

  return hash_vector;
}

function hashEverythingAndReturn(content) {
  var re_pdiv = /<(([pP])|([dD][iI][vV]))[ /\t>]/g;
  return chunkAndHash(re_pdiv, content);
}

/*function hashEverything(content) {
  var displayWarning = 0;
  var re_pdiv = /<(([pP])|([dD][iI][vV]))[ /\t>]/g;
  results_pdiv = chunkAndCheck(re_pdiv, content);

  var bad = results_pdiv['bad'];
  var total = results_pdiv['total'];
  console.log("pb hashEverything() > bad: " + bad + ", total: " + total);

  // TODO adjust the threshold
  if(bad > 0) { displayWarning = 1; }

  if(displayWarning == 1 || debug == 1) {
    // redirect user to warning page
    var data = "test";
    var redirectUrl = chrome.runtime.getURL('blocked.html') + "?data=" + data;
    console.log("pb hashEverything() > redirecting to " + redirectUrl);
    chrome.runtime.sendMessage({action: "redirect", msg: redirectUrl}, function(response) {
      if (chrome.runtime.lastError) {
        console.log("pb hashEverything() > error in redirect request: " + chrome.runtime.lastError.message);
      }
    });
  }
}//*/

console.log("pb cs-end > begin: " + location.href);

// other stuff
var debug = 0;
var obj = obj || {};
obj['ready'] = 0;
obj['hashes'] = null;

var cleaned_html = ((document.all[0].outerHTML)
                      .replace(/\t/g, ' ')
                      .replace(/\s\s+/g, ' ')
                      .replace(/^\s*$/g, '')
                      .replace(/^\s*/g, '')
                      .replace(/\s\s+/g, ' ')
                      .replace(/\s+/g, ' ')
                      .replace(/> </g, '><')
                      .trim());

console.debug(('pb cs-end >' + ' shouldRun? ' + shouldRun + ' shouldCrawl? ' + shouldCrawl));

if(shouldCrawl == 1) {
  if (debug == 1) {
    console.log("pb cs-end > crawling takes precedence over running. crawling only.");
  }

  var dom_hashes = hashEverythingAndReturn(cleaned_html);
  chrome.runtime.sendMessage(
    { action: 'page_add_hashes',
      domain: document.domain,
      last_updated: Date.now(),
      hashes: dom_hashes },
    function(response) {
      console.log("pb cs-end page_add_hashes > resp: " + response.msg);
    });
} else if(shouldRun == 1 || debug == 1) {
  // XXX run checks in background.js or here?
  //
  // 2016-01-11 method #1: hash checks in cs-end
  // running indexedDB doens't work here because of CSP...
  // # check in map (need snapshots inside localStorage)
  //   (like a bloom filter, almost)
  // # all matches get queried inside index
  //   (provide a list of what sites we want to forward to)
  //
  // 2016-01-12 method #2: check hashes in background.js
  // # send hashes to background.js
  //   # background.js processes against indexedDB
  // # receive results
  // # make determination to redirect or otherwise
  //   (should probably be done in background.js, too)
  var dom_hashes = hashEverythingAndReturn(cleaned_html);
  chrome.runtime.sendMessage(
    { action: 'check_hashes',
      hashes: dom_hashes },
    function(response) {
      /*
        response format:
        {
          matches: 13,
          domains: 
            { good.example.com: 10,
              bad.example.com: 3 }
        }
      */
      console.debug(("pb cs-end check_hashes >"
        + " bad: " + response.matches
        + " total: " + dom_hashes.length));
      console.debug("pb cs-end check_hashes > domains: ");
      console.log(response.domains);

      if (response.matches > 0 || debug == 1) {
        // redirect user to warning page
        var data = {
          debugMode: debug,
          visited: document.domain,
          matches: response.matches,
          total: dom_hashes.length,
          suggested: response.domains
        };
        var redirectUrl = chrome.runtime.getURL('blocked.html') + "?data=" + util.utf8_to_b64(JSON.stringify(data));
        console.log("pb cs-end check_hashes > redirecting to " + redirectUrl);
        chrome.runtime.sendMessage({action: "redirect", msg: redirectUrl}, function(response) {
          if (chrome.runtime.lastError) {
            console.log("pb cs-end check_hashes > error in redirect request: " + chrome.runtime.lastError.message);
          }
        });
      }
    });
} // end shouldRun
// end main

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    console.log('pb cs-end listener > received request');
    if(request.action == 'log') {
      console.log('pb cs-end log > ' + request.msg);
      sendResponse({msg: 'ok'});
    } // end 'log'
    else if(request.action == 'request_dom') {
      console.log('pb cs-end > dom requested, sending back dom');
      sendResponse({
        msg: 'ok',
        domain: document.domain,
        last_updated: Date.now(),
        hashes: hashEverythingAndReturn(cleaned_html)
      });
    } // end 'request_dom'
    else {
      console.log('pb cs-end > received unknown action');
    }
});

console.log("pb cs-end > end");
