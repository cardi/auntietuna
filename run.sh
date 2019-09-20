#!/usr/bin/env bash
# SPDX-License-Identifier: GPL-3.0-or-later

#
# run.sh: wrapper script using `web-ext` to develop and test our
# extension
#

FIREFOX_BIN="$HOME/Applications/Firefox Developer Edition.app/Contents/MacOS/firefox-bin"

 OPTS=()
 OPTS+=(--browser-console)                                 # open a browser console
 OPTS+=(--start-url www.mozilla.org)                       # open this tab on start
 OPTS+=(--verbose)                                         # verbose output for web-ext
#OPTS+=(--keep-profile-changes)                            # persist profile across runs
 OPTS+=(--pref devtools.webconsole.timestampMessages=true) # timestamp messages in console
 OPTS+=(--start-url about:debugging#/runtime/this-firefox) # open debugging tab
 OPTS+=(--pref='datareporting.policy.firstRunURL=')        # don't load privacy page

web-ext run \
  --source-dir="$PWD/src" \
  --firefox="${FIREFOX_BIN}" \
  ${OPTS[@]}