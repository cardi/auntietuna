# AuntieTuna

**AuntieTuna** is a browser extension that checks if each visited page
is a potential phishing website based on snapshots of known good
websites that a user adds.

For example, a user adds a snapshot of Bank of FooBar. The extension
then checks every other page the user visits to see if it looks like
Bank of FooBar–if it does, it's likely phish and blocked.

A peer-reviewed, research paper describing the details and usability of
AuntieTuna can be found online:
> Calvin Ardi and John Heidemann 2016. **AuntieTuna: Personalized
> Content-Based Phishing Detection**. *Proceedings of the NDSS Workshop
> on Usable Security* (San Diego, California, USA, Feb. 2016).
> ([BibTeX](https://ant.isi.edu/bib/Ardi16a.html),
> [PDF](https://www.isi.edu/%7ejohnh/PAPERS/Ardi16a.pdf))

Additional information and a copy of this software its source code can
also be found at <https://auntietuna.ant.isi.edu> or
<https://github.com/cardi/auntietuna>.

## quick start

Get up and running with the
[quick start guide](https://auntietuna.ant.isi.edu/documentation/quick-start).

## installation

You can install the AuntieTuna browser extension for Mozilla Firefox
and Chromium-based browsers (Chromium, Google Chrome, Brave).

Find the instructions for your browser below.

[Information about the requested permissions](https://auntietuna.ant.isi.edu/documentation/faq).

### firefox

**General Installation**:
Go to the [Latest Release](https://github.com/cardi/auntietuna/releases/latest)
page and install the signed add-on (`auntietuna-0.0.x.x-fx.xpi`).
If you saved the `.xpi` file to your computer, you can
[install the add-on from the file](https://extensionworkshop.com/documentation/publish/distribute-sideloading/#install-addon-from-file).

**Temporary Installation**:
To install the latest development snapshot (temporarily) from git or a
[release](https://github.com/cardi/auntietuna/releases/latest) (`.zip`
or `.tar.gz`):
1. Clone the git repository or download a release tarball
2. In Firefox, go to `about:debugging#/runtime/this-firefox`
3. Click on "Load Temporary Add-on..."
4. Browse to and open `auntietuna/src/manifest.json`
5. AuntieTuna is now temporarily installed until you exit the browser

You need to repeat these installation steps after you restart the
browser. Known-good data is deleted on exit.

### chromium / chromium-based browsers (chrome, brave)

**General Installation**:
Install from the Chrome Web Store (TODO).

**Sideloading Instructions**:
1. Clone the git repository or download and extract a release tarball
2. Go to Extensions (Window -> Extensions) or "chrome://extensions"
3. Toggle "Developer mode" in the top right to "On"
4. Click on "Load unpacked"
5. Select the directory containing AuntieTuna and click "Open"

AuntieTuna is now installed.

Note that you need to update manually when new versions are released by
repeating the steps above.

### development (firefox)

Running the development version of AuntieTuna using [`run.sh`](./run.sh)
(a wrapper around `web-ext`) will launch Firefox with a clean, temporary
profile with AuntieTuna pre-installed that is independent of existing
profiles you may have.

Data is ***not saved*** after you close Firefox! (You can uncomment the
line in [`run.sh`](./run.sh) containing `--keep-profile-changes` if you
want a persistent profile.)

1. Install Mozilla Firefox
2. Install `web-ext`
3. Clone this repository: `git clone https://github.com/cardi/auntietuna.git`
4. (optional) In `run.sh`, modify the paths to `FIREFOX_BIN` and `FIREFOX_DIST`
5. Execute `run.sh`

You can also build an unsigned `.xpi` by running `make` at the root of
the repository. The unsigned extension can be installed on Firefox
[Nightly](https://www.mozilla.org/en-US/firefox/nightly/all/) or
[Developer](https://www.mozilla.org/en-US/firefox/developer/).

#### firefox nightly / developer edition

If you're running Firefox Nightly or Developer edition, you can install
an unsigned extension by [disabling signature
enforcement](https://wiki.mozilla.org/Add-ons/Extension_Signing#FAQ):

1. type `about:config` into the URL bar in Firefox
2. in the Search box type `xpinstall.signatures.required`
3. double-click the preference, or right-click and selected "Toggle", to
   set it to `false`.

You can now load an unsigned addon from a file.

### development (chromium)

Running the development version of AuntieTuna using
[`run-chrome.sh`](./run-chrome.sh) (a wrapper around `web-ext`) will
launch Chromium with a clean, temporary profile with AuntieTuna
pre-installed that is independent of existing profiles you may have.

Data is ***not saved*** after you close Chromium!

1. Install Chromium
2. Install `web-ext`
3. Clone this repository: `git clone https://github.com/cardi/auntietuna.git`
4. (optional) In `chrome-run.sh`, modify the paths to `CHROMIUM_BIN`
5. Execute `run-chrome.sh`

The latest git commit of AuntieTuna can also be installed manually by
following the "[Sideloading Instructions](#chromium--chromium-based-browsers-chrome-brave)".

## usage

On a website you normally log in to, click on the shield icon and
"Add to Good List".

The extension now checks, behind the scenes, if every visited webpage is
phish or not. If it is, you'll be prevented from clicking through.

**NOTE**: Software is in ALPHA stage! There *might* be false positives
and/or broken websites. Please send feedback to <calvin@isi.edu>.

## contributing

Contributions are welcome!

We generally need help with the following:
* general usage of the addon
* finding/reporting false positives
* porting to Google Chrome / Chromium
* [and more...](https://auntietuna.ant.isi.edu/documentation/developing/)

Feel free to open a [pull request](https://github.com/cardi/auntietuna/pulls)
or an [issue](https://github.com/cardi/auntietuna/issues), or send email
to <calvin@isi.edu> with questions, bugs, feature requests, patches, and
any notes on your usage.

## libraries used

| name                                | link                                            | license        |
| ---                                 | ---                                             | ---            |
| CryptoJS                            | http://code.google.com/p/crypto-js              | `BSD-3-Clause` |
| Dexie.js                            | https://github.com/dfahlander/Dexie.js/         | `Apache-2.0`   |
| FileSaver                           | https://github.com/eligrey/FileSaver.js         | `MIT`          |
| shield icon                         | https://github.com/feathericons/feather         | `MIT`          |
| WebExtension `browser` API Polyfill | https://github.com/mozilla/webextension-polyfill| `MPL-2.0`      |

## copyright

Copyright (C) 2016-2019  University of Southern California

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.

## license

[`GPL-3.0-or-later`](./LICENSE)
