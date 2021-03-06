// SPDX-License-Identifier: GPL-3.0-or-later

'use strict';

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
    DEBUG = false,
    debug = DebugOptions.None;

// set debug options
storage.get("debug").then( (result) => {
  if("debug" in result) {
    DEBUG && console.debug("[cs/get] debug =", result.debug);
    if(result.debug === true) {
    DEBUG = true;
    debug = debug | DebugOptions.AlwaysRunDetection;
    debug = debug | DebugOptions.NoRedirectOnMatch;
    debug = debug | DebugOptions.Verbose;
    }
  } else {
    DEBUG && console.debug("[cs/get] key 'debug' doesn't exist in result");
  }
}, onError);

// function defs
function onError(error) {
  DEBUG && console.error("[cs]", `${error}`);
}

function onGetWhitelist(items) {
  DEBUG && console.info("[cs/onGetWhitelist] document domain:", document.domain);

  // sometimes we have nothing loaded in db (and thus no whitelist)
  if (typeof items === 'undefined'
        || items === null
        || !("whitelist" in items))
  {
    DEBUG && console.info("[cs/onGetWhitelist] whitelist doesn't exist => running checks");
		runMode = 1;
    shouldRun = 1;
    return;
  }

  let whitelisted_domains = items['whitelist'];
  DEBUG && console.info("[cs/onGetWhitelist] whitelist:", `${whitelisted_domains}`);

  // whitelisting needs to be done carefully: phish will have
  // "paypal.com" as a subdomain to trick users
  //
  // TODO consider subdomains vs. domains: www.paypal.com vs. paypal.com
  //
  if(whitelisted_domains.indexOf(document.domain) != -1) {
    DEBUG && console.info("[cs/onGetWhitelist] domain in whitelist => *not* running checks");
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
    DEBUG && console.info("[cs/onGetWhitelist] domain *not* in whitelist => running checks");
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
  DEBUG && console.debug("[cs/onGetWhitelist]", `${JSON.stringify(debug_info)}`);
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

    // only do this for chunk sizes >= 30 otherwise we will get
    // tons of false positives
    if((e - b + 1) < 30) {
      DEBUG && console.debug("[cs/chunkAndHash] skipping `" + content.substring(b,e) + "`");
      return;
    }

    var h = CryptoJS.SHA256( content.substring(b,e) );

    hash_vector.push(h.toString(CryptoJS.enc.Hex));
    if (debug & DebugOptions.Verbose) {
      DEBUG && console.debug(b + "-" + e + ": " + h + " `" + content.substring(b,e) + "`");
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
    DEBUG && console.debug("[cs/getCleanedDomHtml] cleaned_html:", cleaned_html);
  }

  return cleaned_html;
}

function hashEverythingAndReturn(content) {
  // TODO validate regex
  var re_pdiv = /<(([pP])|([dD][iI][vV]))[ /\t>]/g;
  return chunkAndHash(re_pdiv, content);
}

// handles messages from popup
async function handleMessage(request, sender, sendResponse) {
  // who are we getting the message from?
  if (sender.tab != null) {
    DEBUG && console.log("[cs/handleMessage] request from tab", sender.tab.id, ":", request.action);
  } else {
    DEBUG && console.log("[cs/handleMessage] request:", request.action);
  }

  switch(request.action) {
  case "log":
    DEBUG && console.log("[cs/handleMessage/log]", request.msg);
    return new Promise(resolve => resolve({response: "ok"}));
    break;
  ////////////////////////////////////
  case "request_dom":
    DEBUG && console.log("[cs/handleMessage/requestDom] processing");

    var dom = getCleanedDomHtml();
    var dom_hashes = hashEverythingAndReturn(dom);

    const dom_data = {
      response     : "ok",
      domain       : document.domain,
      last_updated : Date.now(),
      hashes       : dom_hashes
    };

    return new Promise(resolve => resolve(dom_data));
    break;
  ////////////////////////////////////
  default:
    DEBUG && console.log("[cs/handleMessage] received unknown action:", request.action);
    return new Promise(resolve => resolve({response: ""}));
    break;
  }
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

if ( debug & DebugOptions.AlwaysRunDetection ) { runMode = 1; }

switch ( runMode ) {
case -1: // should never get here
  DEBUG && console.error("[cs] runMode:", runMode, "=> something went wrong");
  return;
case  0: // whitelisted, do nothing
  DEBUG && console.log("[cs] runMode:", runMode, "=> whitelisted site");
  return;
case  1: // run detection
  if ( debug & DebugOptions.AlwaysRunDetection  ) {
    DEBUG && console.log("[cs] runMode:", runMode, "=> debug enabled, run detection");
  } else {
    DEBUG && console.log("[cs] runMode:", runMode, "=> unknown site, run detection");
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
	DEBUG && console.debug("[cs/1] dom_hashes:", dom_hashes);

  // TODO send a Set of a hashes (vs. array)
  var msgSend = browser.runtime.sendMessage({
                  action: 'check_hashes',
                  hashes: dom_hashes
                });

  msgSend.then( msgResp => {
    DEBUG && console.log("[cs/1] check_hashes response:", msgResp);

    // TODO reporting false positives
    // TODO sane logging for debugging/experimental data collection

    // site is possibly a phish
    if (msgResp.number_matched_hashes > 0) {

      DEBUG && console.log("[cs/1] site is suspected phish.");

      let suggested = Object.keys(msgResp.domains_and_matches);

      const manifest = browser.runtime.getManifest();

      var data = {
        auntietunaVersion   : manifest.version,
        browserVersion      : navigator.userAgent,
        timestamp           : Date.now(),
        debugMode           : debug,
        visited             : document.domain,
        matches             : msgResp.number_matched_hashes,
        total               : msgResp.number_submitted_hashes,
        suggested           : suggested,
        domains_and_matches : msgResp.domains_and_matches
      };

      let redirectUrl = browser.runtime.getURL('blocked.html') +
          "?data=" + util.utf8_to_b64(JSON.stringify(data));

      // don't redirect if we have DebugOption enabled
      if (debug & DebugOptions.NoRedirectOnMatch) {
        DEBUG && console.debug("[cs/1] data:", data);
        DEBUG && console.debug("[cs/1] redirectUrl:", redirectUrl);
      } else {
        // redirect by sending a request to background
        var msgSendRedirect = browser.runtime.sendMessage({
                                action: "redirect",
                                msg: redirectUrl});
        msgSendRedirect.then( msgRespRedirect => {
          // TODO
        }, onError);
      }

      // DEBUG: since we're in alpha, inject a DIV with debugging
      // information to sort out false positives

      // create parent div element to inject
      let debugInfoDiv = document.createElement("div");
      debugInfoDiv.id = "phishing-alert-div";

      // create div element to inject into shadow DOM
      //
      // in an effort to avoid using .innerHTML or .insertAdjacentHTML()
      // we can programatically build the injected div by creating
      // individual nodes and "building" them together, and finally
      // attaching it to the shadow DOM.
      //
      // TODO there's probably a better way to do this
      let div = document.createElement('div');

      let style = document.createElement('style');
      style.textContent =
         `:host {
            all        : initial; /* 1st rule so subsequent properties are reset. */
            display    : block;
            background : white;
          }

          a {
            font-weight: bold;
          }

          button {
            border-radius : 2px;
            cursor        : pointer;
            font-size     : 1.25rem;
            padding       : 0.5em 1em;
          }

          p {
            text-align: center;
          }

          pre {
            max-height  : 200px;
            white-space : pre-wrap;
            word-wrap   : break-word;
            overflow-x  : auto;
            overflow-y  : scroll;
            border      : solid 1px #000000;
            background  : #eee;
            padding     : 1.00em 1.00em;
          }`
      div.appendChild(style);

      let header = document.createElement('div');
      header.style.textAlign = "center";
      let title = document.createElement('h1');
      title.textContent = "AuntieTuna thinks this is a phishing attempt.";
      header.appendChild(title);
      div.appendChild(header);

      // this is a horrendous way of doing things
      let p = document.createElement('p');
      p.appendChild(document.createTextNode("Did we get this one wrong? "));

      // build a pre-filled Google Forms link
      let param = encodeURIComponent(JSON.stringify(data));
      let a = document.createElement('a');
      a.href = "https://docs.google.com/forms/d/e/1FAIpQLSc85evxkjWWUul5TBB8zRA4GQGS8Fpya5fI-14PBm4GH2gBgA/viewform?usp=pp_url&entry.1410474703=False+positive+(a+website+was+marked+as+phish+when+it+isn't)&entry.662591020=false+positive+on+a+website&entry.559542417=" + param;
      a.textContent = "Click here to submit a bug report!";
      p.appendChild(a);

      p.appendChild(document.createTextNode(" Thank you!"));
      div.appendChild(p);

      let pre = document.createElement('pre');
      pre.id = "data";
      pre.textContent = JSON.stringify(data);
      div.appendChild(pre);

      // close button deletes the alert (one-time)
      let closeP = document.createElement('p');
      let closeBtn = document.createElement('button');
      closeBtn.textContent = "Close";
      closeBtn.addEventListener("click", () => {
        document.getElementById("phishing-alert-div").remove();
      });
      closeP.appendChild(closeBtn);
      div.appendChild(closeP);

      //////////////////////////////////////////////////////////////////

      let shadow = debugInfoDiv.attachShadow({mode: 'open'});
      shadow.appendChild(div);

      debugInfoDiv.style.height    = "300px";
      debugInfoDiv.style.position  = "fixed";
      debugInfoDiv.style.bottom    = "0";
      debugInfoDiv.style.left      = "50%";
      debugInfoDiv.style.width     = "75%";
      debugInfoDiv.style.padding   = "1em 1em";
      debugInfoDiv.style.transform = "translate(-50%, -100%)";
      debugInfoDiv.style.zIndex    = "9999";
      debugInfoDiv.style.border    = "solid 3px black";

      document.body.insertBefore(debugInfoDiv, document.body.firstChild);
    } else {
      DEBUG && console.log("[cs/1] site is not suspected phish");
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
  DEBUG && console.log("[cs] runMode:", runMode, "=> refresh crawl");

  var dom = getCleanedDomHtml();
  var dom_hashes = hashEverythingAndReturn(dom);
	DEBUG && console.debug("[cs/3] dom_hashes:", dom_hashes);

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

// add listener for getting messages from popup
browser.runtime.onMessage.addListener(handleMessage);
////////////////////////////////////////////////////////////////////////
