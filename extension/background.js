// see https://chrome-apps-doc2.appspot.com/extensions/samples.html

'use strict';
chrome.runtime.onInstalled.addListener(function() {
  chrome.storage.sync.set({color: '#000000'});
});

chrome.commands.onCommand.addListener(function(command) {
  if (command == "gen-pwd") {
    chrome.tabs.getSelected(null, function(tab) {
      chrome.tabs.executeScript(tab.id, {file: "formfill.js"});
    });
  }
});
