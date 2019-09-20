#!/usr/bin/env bash
# SPDX-License-Identifier: GPL-3.0-or-later

#
# run.sh: wrapper script using `web-ext` to develop and test our
# extension
#

FIREFOX_BIN="$HOME/Applications/Firefox Developer Edition.app/Contents/MacOS/firefox-bin"
FIREFOX_DIST="$HOME/Applications/Firefox Developer Edition.app/Contents/Resources/distribution"

 OPTS=()
 OPTS+=(--browser-console)                                 # open a browser console
 OPTS+=(--start-url www.mozilla.org)                       # open this tab on start
 OPTS+=(--verbose)                                         # verbose output for web-ext
#OPTS+=(--keep-profile-changes)                            # persist profile across runs
 OPTS+=(--pref devtools.webconsole.timestampMessages=true) # timestamp messages in console
 OPTS+=(--start-url about:debugging#/runtime/this-firefox) # open debugging tab
 OPTS+=(--pref='datareporting.policy.firstRunURL=')        # don't load privacy page

 # disable telemetry
 OPTS+=(--pref='datareporting.healthreport.uploadEnabled=false')

 # disable telemetry notifcation
 OPTS+=(--pref='datareporting.policy.dataSubmissionPolicyBypassNotification=true')

 # disable annoying "door-hanger" notifcation from the hamburger button
 OPTS+=(--pref='app.update.doorhanger=false')
 OPTS+=(--pref='app.update.silent=true')
 OPTS+=(--pref='app.update.disable_button.showUpdateHistory=false')
 OPTS+=(--pref='app.update.url=')
 OPTS+=(--pref='app.update.url.details=')
 OPTS+=(--pref='app.update.url.manual=')
 OPTS+=(--pref='app.update.enabled=false')
 OPTS+=(--pref='app.update.download.promptMaxAttempts=0')
 OPTS+=(--pref='app.update.elevation.promptMaxAttempts=0')
 OPTS+=(--pref='app.update.staging.enabled=false')
 OPTS+=(--pref='app.update.unsupported.url=')

# disable updates
mkdir -p "${FIREFOX_DIST}"
cat << EOF > "${FIREFOX_DIST}/policies.json"
{
  "policies": {
    "DisableAppUpdate": true
  }
}
EOF

 # disable pocket
 OPTS+=(--pref='extensions.pocket.enabled=false')
 OPTS+=(--pref='browser.newtabpage.activity-stream.section.highlights.includePocket=false')
 OPTS+=(--pref='services.sync.prefs.sync.browser.newtabpage.activity-stream.section.highlights.includePocket=false')
 OPTS+=(--pref='extensions.pocket.site=')
 OPTS+=(--pref='browser.newtabpage.activity-stream.discoverystream.endpoints=')
 OPTS+=(--pref='browser.newtabpage.activity-stream.discoverystream.config=')
 OPTS+=(--pref='browser.newtabpage.activity-stream.feeds.section.topstories.options=')
 OPTS+=(--pref='extensions.pocket.api=')
 OPTS+=(--pref='extensions.pocket.oAuthConsumerKey=')
 OPTS+=(--pref='browser.newtabpage.activity-stream.discoverystream.endpointSpocsClear=')
 OPTS+=(--pref='browser.newtabpage.activity-stream.pocketCta=')

 # disable config warning
 OPTS+=(--pref='browser.aboutConfig.showWarning=false')
 OPTS+=(--pref='general.warnOnAboutConfig=false')

web-ext run \
  --source-dir="$PWD/src" \
  --firefox="${FIREFOX_BIN}" \
  ${OPTS[@]}
