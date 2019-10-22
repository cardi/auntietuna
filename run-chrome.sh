#!/usr/bin/env bash
# SPDX-License-Identifier: GPL-3.0-or-later

#
# run-chrome.sh: wrapper script using `web-ext` to develop and test our
# extension on chromium
#

CHROMIUM_BIN="$HOME/Applications/Chromium.app/Contents/MacOS/Chromium"

 OPTS=()
#OPTS+=(--browser-console)                                 # open a browser console
 OPTS+=(--start-url www.mozilla.org)                       # open this tab on start
 OPTS+=(--verbose)                                         # verbose output for web-ext
 OPTS+=(--target chromium)

# check if web-ext is installed
if ! $(type web-ext >/dev/null 2>&1)
then
	echo "[run.sh] error: 'web-ext' is not installed, install using your favorite package manager"
	exit 1
fi

# run
web-ext run \
  --source-dir="$PWD/src" \
  --chromium-binary="${CHROMIUM_BIN}" \
  ${OPTS[@]}
