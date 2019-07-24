// SPDX-License-Identifier: GPL-3.0-or-later

'use strict';

console.debug("[cs] begin");

// global variables
let storage = browser.storage.local,
		runMode = -1,
    shouldCrawl = 0,
    shouldRun = -1,
    whitelisted_domains = [];

// other stuff
var debug = 1;
var obj = obj || {};
obj['ready'] = 0;
obj['hashes'] = null;

// function defs
function onError(error) {
  console.error("[cs]", `${error}`);
}

function onGetWhitelist(items) {
  console.info("[cs/onGetWhitelist] document domain:", document.domain);

  whitelisted_domains = items['whitelist'];
  console.info("[cs/onGetWhitelist] whitelist: ", `${whitelisted_domains}`);

  // whitelisting needs to be done carefully: phish will have
  // "paypal.com" as a subdomain to trick users
  //
  // TODO consider subdomains vs. domains: www.paypal.com vs. paypal.com
  //
  if(whitelisted_domains.indexOf(document.domain) != -1) {
    console.info("[cs/onGetWhitelist] domain in whitelist => *not* running checks");
		runMode = 0;
    shouldRun = 0;

    // TODO rewrite pending
    //
    // opportunistic recrawl: check when and compare to the last crawl
    // time then set a variable and recrawl (in contentscript-end after
    // document_ready)
    /*chrome.runtime.sendMessage(
      {action: "check_and_recrawl", domain: document.domain},
      function(response) {
        if (chrome.runtime.lastError) {
          console.log("pb cs-start recrawl > error in request: " + chrome.runtime.lastError.message);
        }
        if (response.msg === null) {
          console.log("pb cs-start recrawl > response.msg is null, continuing...");
        }

        var today = new Date(Date.now());
        var last_crawled = new Date(response.msg);
        var diff = Math.abs(today - last_crawled); // results in ms

        console.debug("pb cs-start response > " + response.msg + " diff: " + diff);

        // 12096e5 == 14 days
        if ( diff > 12096e5 ) {
					runMode = 2;
          shouldCrawl = 1;
        }
      });//*/
  } else {
    console.info("[cs/onGetWhitelist] domain *not* in whitelist => running checks");
		runMode = 1;
    shouldRun = 1;
  }

  // debugging information
  let debug_info = {
     "timestamp"        : Date.now()
     ,"runMode"         : runMode
     ,"shouldRun"       : shouldRun
     ,"shouldCrawl"     : shouldCrawl
     ,"whitelist index" : whitelisted_domains.indexOf(document.domain)
     ,"website"         : location.href
     ,"domain"          : document.domain
  };
  console.debug("[cs/onGetWhitelist]", `${JSON.stringify(debug_info)}`);
}

function checkHash(hash) {
  if(obj['hashes'] != null) {
    if(obj['hashes'].indexOf(hash.toString()) != -1) {
      // hash exists on the bad list
      return 1;
    } else {
      return 0;
    }
  } else {
    console.log("[cs/checkHash] obj[hashes] is null");
  }
}

// TODO put a red border around matches (for debugging/info?)
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

function getCleanedDomHtml() {
  let cleaned_html = ((document.all[0].outerHTML)
                        .replace(/\t/g, ' ')
                        .replace(/\s\s+/g, ' ')
                        .replace(/^\s*$/g, '')
                        .replace(/^\s*/g, '')
                        .replace(/\s\s+/g, ' ')
                        .replace(/\s+/g, ' ')
                        .replace(/> </g, '><')
                        .trim());
  console.debug("[cs/getCleanedDomHtml] cleaned_html:", cleaned_html);

  return cleaned_html;
}

function hashEverythingAndReturn(content) {
  // TODO validate regex
  var re_pdiv = /<(([pP])|([dD][iI][vV]))[ /\t>]/g;
  return chunkAndHash(re_pdiv, content);
}

////////////////////////////////////////////////////////////////////////
// entry point
storage
  .get('whitelist')
  .then( items => {
// main routine
onGetWhitelist(items);

if ( debug == 1 ) { runMode = 1; }

switch ( runMode ) {
case -1: // should never get here
  console.error("[cs] runMode:", runMode, "=> something went wrong");
  return;
case  0: // whitelisted, do nothing
  console.log("[cs] runMode:", runMode, "=> whitelisted site");
  return;
case  1: // run detection
  console.log("[cs] runMode:", runMode, "=> unknown site, run detection");
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

  var dom = getCleanedDomHtml();
  var dom_hashes = hashEverythingAndReturn(dom);
	console.debug("[cs/1] dom_hashes:", dom_hashes.join('\n'));

  var msgSend = browser.runtime.sendMessage(
    { action: 'check_hashes',
      hashes: dom_hashes });
  msgSend.then( msgResp => { console.log("response:", msgResp.response); }, onError);

  msgSend = browser.runtime.sendMessage(
    { action: 'log',
      msg: "hello" });
  msgSend.then( msgResp => { console.log("response:", msgResp.response); }, onError);

  /*chrome.runtime.sendMessage(
    { action: 'check_hashes',
      hashes: dom_hashes },
    function(response) {
      //
      //  response format:
      //  {
      //    matches: 13,
      //    domains:
      //      { good.example.com: 10,
      //        bad.example.com: 3 }
      //  }
      //
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
    });//*/
  return;
case  2: // recrawl page due to expiration
  console.log("[cs] runMode:", runMode, "=> refresh crawl");
	/* XXX rewrite in progress
  var dom = getCleanedDomHtml();
  var dom_hashes = hashEverythingAndReturn(dom);
  chrome.runtime.sendMessage(
    { action: 'page_add_hashes',
      domain: document.domain,
      last_updated: Date.now(),
      hashes: dom_hashes },
    function(response) {
      console.log("pb cs-end page_add_hashes > resp: " + response.msg);
    });//*/
  return;
default:
  break;
}
// end main routine
	}, onError);
////////////////////////////////////////////////////////////////////////
