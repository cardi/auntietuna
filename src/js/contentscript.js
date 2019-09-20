// SPDX-License-Identifier: GPL-3.0-or-later

'use strict';

console.debug("[cs] begin");

const DebugOptions = {
  "None"               : 0,
  "AlwaysRunDetection" : 1 << 0,
  "NoRedirectOnMatch"  : 1 << 1,
  "Verbose"            : 1 << 2,
}

// global variables
let storage = browser.storage.local,
		runMode = -1,
    shouldCrawl = 0,
    shouldRun = -1,
    debug = DebugOptions.None;

// set debug options
debug = debug | DebugOptions.AlwaysRunDetection;
debug = debug | DebugOptions.NoRedirectOnMatch;

// function defs
function onError(error) {
  console.error("[cs]", `${error}`);
}

function onGetWhitelist(items) {
  console.info("[cs/onGetWhitelist] document domain:", document.domain);

  // sometimes we have nothing loaded in db (and thus no whitelist)
  if (typeof items === 'undefined'
        || items === null
        || !("whitelist" in items))
  {
    console.info("[cs/onGetWhitelist] whitelist doesn't exist => running checks");
		runMode = 1;
    shouldRun = 1;
    return;
  }

  let whitelisted_domains = items['whitelist'];
  console.info("[cs/onGetWhitelist] whitelist:", `${whitelisted_domains}`);

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

// TODO put a red border around matches (for debugging/info?)
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
    if (debug & DebugOptions.Verbose) {
      console.debug(b + "-" + e + ": " + h + " `" + content.substring(b,e) + "`");
    }
  });

  return hash_vector;
}

function getCleanedDomHtml() {
  let cleaned_html = ((document.all[0].outerHTML)
                        .replace(/[ \t]+/g, ' ')
                        .replace(/[\r\n]+/g, '')
                        .trim());

//                      .replace(/\t/g, ' ')
//                      .replace(/\s\s+/g, ' ')
//                      .replace(/^\s*$/g, '')
//                      .replace(/^\s*/g, '')
//                      .replace(/\s\s+/g, ' ')
//                      .replace(/\s+/g, ' ')
//                      .replace(/> </g, '><')
//                      .trim());

  if (debug & DebugOptions.Verbose ) {
    console.debug("[cs/getCleanedDomHtml] cleaned_html:", cleaned_html);
  }

  return cleaned_html;
}

function hashEverythingAndReturn(content) {
  // TODO validate regex
  var re_pdiv = /<(([pP])|([dD][iI][vV]))[ /\t>]/g;
  return chunkAndHash(re_pdiv, content);
}

////////////////////////////////////////////////////////////////////////

/*
  XXX it's possible that the content script will execute before the
  background script has finished loading (on Firefox only?).

  see Firefox Bugzilla report here:
  https://bugzilla.mozilla.org/show_bug.cgi?id=1474727

  TODO implement workaround, if necessary
*/

// entry point
storage
  .get('whitelist')
  .then( items => {
// main routine
onGetWhitelist(items);

if ( debug | DebugOptions.AlwaysRunDetection ) { runMode = 1; }

switch ( runMode ) {
case -1: // should never get here
  console.error("[cs] runMode:", runMode, "=> something went wrong");
  return;
case  0: // whitelisted, do nothing
  console.log("[cs] runMode:", runMode, "=> whitelisted site");
  return;
case  1: // run detection
  if ( debug & DebugOptions.AlwaysRunDetection  ) {
    console.log("[cs] runMode:", runMode, "=> debug enabled, run detection");
  } else {
    console.log("[cs] runMode:", runMode, "=> unknown site, run detection");
  }

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
	console.debug("[cs/1] dom_hashes:", dom_hashes);

  // TODO send a Set of a hashes (vs. array)
  var msgSend = browser.runtime.sendMessage({
                  action: 'check_hashes',
                  hashes: dom_hashes
                });

  msgSend.then( msgResp => {
    console.log("[cs/1] check_hashes response:", msgResp);

    // TODO reporting false positives
    // TODO sane logging for debugging/experimental data collection

    // site is possibly a phish
    if (msgResp.number_matched_hashes > 0) {

      console.log("[cs/1] site is suspected phish.");

      var data = {
        debugMode : debug,
        visited   : document.domain,
        matches   : msgResp.number_matched_hashes,
        total     : msgResp.number_submitted_hashes,
        suggested : "TODO"
      };

      let redirectUrl = browser.runtime.getURL('blocked.html') +
          "?data=" + util.utf8_to_b64(JSON.stringify(data));

      // don't redirect if we have DebugOption enabled
      if (debug & DebugOptions.NoRedirectOnMatch) {
        console.debug("[cs/1] data:", data);
        console.debug("[cs/1] redirectUrl:", redirectUrl);
      } else {
        // redirect by sending a request to background
        var msgSendRedirect = browser.runtime.sendMessage({
                                action: "redirect",
                                msg: redirectUrl});
        msgSendRedirect.then( msgRespRedirect => {
          // TODO
        }, onError);
      }
    } else {
      console.log("[cs/1] site is not suspected phish");
    }
  }, onError);

  /*// test browser.runtime.sendMessage()
  console.debug("[cs] sendMessage: echo - hello");
  var msgSendTest = browser.runtime.sendMessage({
                      action: 'echo',
                      msg: "hello"
                    });
  msgSendTest.then( msgResp =>
    { console.log("[cs/1] echo response:", msgResp.response); },
    onError);
  //*/
  return;
case  2: // recrawl page due to expiration
  console.log("[cs] runMode:", runMode, "=> refresh crawl");

  var dom = getCleanedDomHtml();
  var dom_hashes = hashEverythingAndReturn(dom);
	console.debug("[cs/3] dom_hashes:", dom_hashes);

  // TODO send a Set of a hashes (vs. array)

  // TODO backend needs rewrite

  // TODO consider behavior of when multiple pages from the same
  // domain are added. maybe also store page URL
  var msgSend = browser.runtime.sendMessage({
                  action       : 'page_add_hashes',
                  domain       : document.domain,
                  last_updated : Date.now(),
                  hashes       : dom_hashes
                });

  msgSend.then( msgResp =>
    { console.log("[cs/3] page_add_hashes response:", msgResp.response); },
    onError);

  return;
default:
  break;
}
// end main routine
	}, onError);
////////////////////////////////////////////////////////////////////////
