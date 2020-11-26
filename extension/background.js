'use strict';

// see https://developer.chrome.com/extensions/messaging

chrome = chrome || { valueOf: () => false };

if (!chrome.valueOf()) {
  throw 'chrome is not defined';
}

(() => {
  const
      storage = chrome.storage.local,
      tabs = chrome.tabs,
      runtime = chrome.runtime;

  function storageSet(key, value) {
    return new Promise((resolve) => storage.set({[key]: value}, _ => resolve(value)));
  }

  function storageRemove(key) {
    return new Promise((resolve) => storage.remove(key, _ => resolve()));
  }

  // region optional get settings / masterPassword from local storage of the chrome extension
  var _user = '',
      _settings = null,
      _master = null,
      _volatile = true;

  storage.get('user', u => _user = (typeof u === 'object' && u.user) ? u.user : '');
  storage.get('settings', s => _settings = s ? s.settings : null);
  storage.get('pass', p => {
    if (typeof p === 'object' && p.pass) {
      _master = p.pass;
      _volatile = false;
    }
  });
  // endregion

  runtime.onMessage.addListener((msg, sender, sendResponse) => {
    switch (msg.action) {
      case 'get-master-secret':
        if (_master === null) {
          sendResponse({'secret': null});
        }
        sendResponse({'secret': _master + _user, 'volatile': _volatile});
        break;

      case 'get-user':
        sendResponse(_user);
        break;

      case 'get-transfer-settings':
        sendResponse(_settings.transfer ?? []);
        break;

      case 'set-transfer-settings':
        _settings = Object.assign(_settings ?? {}, {transfer: msg.transferSettings});
        storageSet('settings', _settings)
            .then(() => sendResponse({'success': true, 'text': 'Settings saved', newSettings: _settings}));
        break;

      case 'get-site-settings':
        sendResponse(_settings[msg.hash]);
        break;

      case 'set-site-settings':
        _settings = Object.assign(_settings ?? {}, msg.siteSettings);
        storageSet('settings', _settings)
            .then(() => sendResponse({'success': true, 'text': 'Site settings saved', newSettings: _settings}));
        break;

      case 'remove-site':
        delete _settings[msg.hash];
        storageSet('settings', _settings)
            .then(() => sendResponse({'success': true, 'text': 'Site settings removed'}));
        return true;

      case 'get-settings':
        sendResponse({'settings': _settings});
        break;

      case 'set-master-pass':
        _volatile = msg.volatile;
        _master = msg.pass;
        if (_volatile) {
          storageRemove('pass').then(null);
          sendResponse({'success': true, 'text': `Master password ${_master ? 'set volatile' : 'removed'}`});
        } else {
          if (!msg.pass) {
            storageRemove('pass')
                .then(() => sendResponse({'success': true, 'text': `Master password removed`}));
          } else {
            storageSet('expired', msg.expired)
                .then(() => storageSet('pass', msg.pass))
                .then(() => sendResponse({
                  'success': true,
                  'text': `Master password permanently set, it expires on ${new Date(msg.expired).toISOString().slice(0, 10)}`
                }));
          }
        }
        break;

      case 'set-master-user':
        _user = msg.value ? msg.value : '';
        if (_user === '') {
          storageRemove('user').then(() => sendResponse({
            'success': true,
            'text': `Master user removed`
          }));
          break;
        }
        storageSet('user', _user).then(() => sendResponse({
          'success': true,
          'text': `Master user permanently set`
        }));
        break;

      case 'set-settings':
        _settings = msg.settings;
        storageSet('settings', _settings).then(() => sendResponse({
          'success': true,
          'msg': `Settings changed`
        }));
        break;

      default:
        return false;
    }

    return true;
  });

  function updateBrowserAction(tabId, callback) {
    storage.get('expired', (item) => {
      let title = 'e@syPe@sy';
      if (item) {
        let icon = 'icon/_128.png';
        if (item.expired < new Date().getTime()) {
          title = 'Master password expires soon';
          icon = 'icon/_128_err.png';
        } else if (item.expired - new Date().getTime() < 1000 * 5) {
          title = 'expiring date:' + new Date(item.expired).toLocaleString();
          icon = 'icon/_128_warn.png';
        }

        chrome.browserAction.setTitle({title: title});
        chrome.browserAction.setIcon({
          path: icon,
          tabId: tabId
        });
      } else {
        storage.set({'expired': new Date().getTime() + 1000 * 10});
        chrome.browserAction.setTitle({title: title});
      }
      if (callback) {
        setTimeout(() => callback(title), 100);
      }
    });
  }

  tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    if (changeInfo.status === 'complete') {
      updateBrowserAction(tabId);
    }
  });

  let action = null;
  chrome.commands.onCommand.addListener(function (command) {

    storage.get('settings', async function (_) {
      const settingsJs = `requestAnimationFrame(() => easyPeasyAuth.setSettings(JSON.parse('${JSON.stringify(_.settings)}')))`;

      if (command === "gen-pwd") {
        tabs.getSelected(null, function (tab) {
          tabs.executeScript(tab.id, {file: "lib/crypto.js"});
          tabs.executeScript(tab.id, {code: settingsJs});
          tabs.executeScript(tab.id, {file: "lib/commit-action.js"});
        });
      } else if (command === "pwd-action") {
        tabs.getSelected(null, function (tab) {
          tabs.executeScript(tab.id, {file: "lib/crypto.js"});
          tabs.executeScript(tab.id, {code: settingsJs});
          tabs.executeScript(tab.id, {file: "lib/chose-action.js"});
        });
      }
    });
  });
})();

// chrome.storage.local.get('settings', (_) => console.log('settings', _.settings));
// chrome.storage.local.get('pass', _ => console.log('pass', _));
// chrome.storage.local.get('user', _ => console.log('user', _));
// chrome.storage.local.get('user', v => console.log('"' + (typeof v === 'object' && v.value ? v.value : '') + '"'));

// prevent attacks on local storage etc.
delete chrome.storage;
delete chrome.tabs;
delete chrome.runtime;
