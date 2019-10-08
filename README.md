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

## contributing

Contributions are welcome!

We need help with the following:
* general usage of the addon
* finding/reporting false positives
* porting to Google Chrome / Chromium (might require polyfill libraries)
* **TODO**

Feel free to open a [pull request](https://github.com/cardi/auntietuna/pulls)
or an [issue](https://github.com/cardi/auntietuna/issues), or send email
to <calvin@isi.edu> with questions, bugs, feature requests, patches, and
any notes on your usage.

## installation

You can install the AuntieTuna browser extension via sideloading.

[Information about the requested permissions](#TODO).

### firefox

**General Installation**:
Go to the [Latest Release](https://github.com/cardi/auntietuna/releases/latest)
page and install the signed add-on (`auntietuna-0.0.x.x-fx.xpi`).
If you saved the `.xpi` file to your computer, you can
[install the add-on from the file](https://extensionworkshop.com/documentation/publish/distribute-sideloading/#install-addon-from-file).

**Temporary Installation**:
To install the latest development snapshot (temporarily) from git:
1. Go to `about:debugging#/runtime/this-firefox`
2. Click on "Load Temporary Add-on..."
3. Browse to and open `auntietuna/src/manifest.json`
4. AuntieTuna is temporarily installed until you exit the browser

### chrome / chromium

*v0.0.4+ has not yet been tested for compatibility with Google Chrome /
Chromium.*

The following instructions are for v0.0.3 and earlier:

1. Go to Extensions (Window -> Extensions) or "chrome://extensions"
2. Click on "Load unpacked extensions..."
3. Select the directory containing this extension and click on "Select"
4. To view debugging information for the extension on a visited webpage,
   go to View -> Developer -> JavaScript Console

### development (firefox)

Running the development version will launch Firefox with a clean,
temporary profile with AuntieTuna pre-installed that is independent of
existing profiles you may have.

Data is ***not saved*** after you close Firefox! (You can uncomment the
line containing `--keep-profile-changes` if you want a persistent
profile.)

1. Install Mozilla Firefox
2. Install `web-ext`
3. Clone this repository: `git clone https://github.com/cardi/auntietuna.git`
4. (optional) In `run.sh`, modify the paths to `FIREFOX_BIN` and `FIREFOX_DIST`
5. Execute `run.sh`

Optionally, you can build an unsigned `.xpi` by running `make` at the
root of the repository. The unsigned extension can be installed on
Nightly / Developer editions of Firefox (see next subsection).

#### firefox nightly / developer edition

If you're running Firefox Nightly or Developer edition, you can install
an unsigned extension by [disabling signature
enforcement](https://wiki.mozilla.org/Add-ons/Extension_Signing#FAQ):

1. type `about:config` into the URL bar in Firefox
2. in the Search box type `xpinstall.signatures.required`
3. double-click the preference, or right-click and selected "Toggle", to
   set it to `false`.

You can now load an unsigned addon from a file.

### development (chrome / chromium)

**TODO**

## usage

On a website you normally log in to, click on the shield icon and
"Add to Good List".

The extension now checks, behind the scenes, if every visited webpage is
phish or not. If it is, you'll be prevented from clicking through.

**NOTE**: Software is in ALPHA stage! There *might* be false positives
and/or broken websites. Please send feedback to <calvin@isi.edu>.

## libraries used

| name        | link                                     | license        |
| ---         | ---                                      | ---            |
| CryptoJS    | http://code.google.com/p/crypto-js       | `BSD-3-Clause` |
| Dexie.js    | https://github.com/dfahlander/Dexie.js/  | `Apache-2.0`   |
| FileSaver   | https://github.com/eligrey/FileSaver.js  | `MIT`          |
| shield icon | https://github.com/feathericons/feather  | `MIT`          |

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
