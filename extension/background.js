// see https://developer.chrome.com/extensions/messaging
(() => {
  // region optional get settings / masterPassword from local storage of the chrome extension
  const storage = chrome.storage.local;
  const { tabs } = chrome;
  const { runtime } = chrome;

  let user = '';
  let settings = null;
  let master = null;
  let volatile = true;

  function storageSet(key, value) {
    return new Promise((resolve) => storage.set({ [key]: value }, () => resolve(value)));
  }

  function storageRemove(key) {
    return new Promise((resolve) => storage.remove(key, () => resolve()));
  }

  storage.get('user', (u) => { user = (typeof u === 'object' && u.user) ? u.user : ''; return undefined; });
  storage.get('settings', (s) => { settings = s ? s.settings : null; return undefined; });
  storage.get('pass', (p) => {
    master = null;
    if (typeof p === 'object' && p.pass) {
      master = p.pass;
      volatile = false;
    }
  });
  // endregion

  runtime.onMessage.addListener((msg, sender, sendResponse) => {
    switch (msg.action) {
      case 'get-master-secret':
        if (master === null) {
          sendResponse({ secret: null });
        }
        sendResponse({ secret: master + user, volatile });
        break;

      case 'get-user':
        sendResponse(user);
        break;

      case 'get-transfer-settings':
        if (settings && settings.transfer) {
          sendResponse(settings.transfer || []);
        }
        sendResponse([]);
        break;

      case 'set-transfer-settings':
        settings = Object.assign(settings || {}, { transfer: msg.transferSettings });
        storageSet('settings', settings)
          .then(() => sendResponse({ success: true, text: 'Settings saved', newSettings: settings }));
        break;

      case 'get-site-settings':
        sendResponse(settings[msg.hash]);
        break;

      case 'remove-site':
        delete settings[msg.hash];
        storageSet('settings', settings)
          .then(() => sendResponse({ success: true, text: 'Site settings removed' }));
        break;

      case 'set-site-settings':
        settings = Object.assign(settings || {}, msg.siteSettings);
        storageSet('settings', settings)
          .then(() => sendResponse({ success: true, text: 'Site settings saved', newSettings: settings }));
        break;

      case 'get-settings':
        sendResponse({ settings });
        break;

      case 'set-master-pass':
        volatile = msg.volatile;
        master = msg.pass;
        if (volatile) {
          storageRemove('pass').then(null);
          sendResponse({ success: true, text: `Master password ${master ? 'set volatile' : 'removed'}` });
        } else if (!msg.pass) {
          storageRemove('pass')
            .then(() => sendResponse({ success: true, text: 'Master password removed' }));
        } else {
          const expiringDate = new Date(msg.expired).toISOString().slice(0, 10);
          storageSet('expired', msg.expired)
            .then(() => storageSet('pass', msg.pass))
            .then(() => sendResponse({
              success: true,
              text: `Master password permanently set, it expires on ${expiringDate}`,
            }));
        }
        break;

      case 'set-master-user':
        user = msg.value ? msg.value : '';
        if (user === '') {
          storageRemove('user').then(() => sendResponse({
            success: true,
            text: 'Master user removed',
          }));
          break;
        }
        storageSet('user', user).then(() => sendResponse({
          success: true,
          text: 'Master user permanently set',
        }));
        break;

      case 'set-settings':
        settings = msg.settings;
        storageSet('settings', settings).then(() => sendResponse({
          success: true,
          msg: 'Settings changed',
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
          title = `expiring date:${new Date(item.expired).toLocaleString()}`;
          icon = 'icon/_128_warn.png';
        }

        chrome.browserAction.setTitle({ title });
        chrome.browserAction.setIcon({
          path: icon,
          tabId,
        });
      } else {
        storage.set({ expired: new Date().getTime() + 1000 * 10 });
        chrome.browserAction.setTitle({ title });
      }
      if (callback) {
        setTimeout(() => callback(title), 100);
      }
    });
  }

  tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.status === 'complete') {
      updateBrowserAction(tabId);
    }
  });

  chrome.commands.onCommand.addListener((command) => {
    tabs.getSelected(null, (tab) => {
      tabs.executeScript(tab.id, { code: 'scriptOptions = void(0);' });
      tabs.executeScript(tab.id, { file: 'lib/crypto.js' });
      tabs.executeScript(tab.id, { file: command === 'gen-pwd' ? 'lib/commit-action.js' : 'lib/chose-action.js' });
    });
  });

  function onCtxMenuClick(info, tab) {
    if (info.menuItemId === 'user') {
      tabs.executeScript(tab.id, { code: 'scriptOptions = \'set-user\';' });
    } else if (info.menuItemId === 'pwd') {
      tabs.executeScript(tab.id, { code: 'scriptOptions = \'set-pass\';' });
    } else if (info.menuItemId === 'cp_user') {
      tabs.executeScript(tab.id, { code: 'scriptOptions = \'cp-user\';' });
    } else if (info.menuItemId === 'cp_pwd') {
      tabs.executeScript(tab.id, { code: 'scriptOptions = \'cp-pass\';' });
    } /** else menuItemId === page */
    tabs.executeScript(tab.id, { file: 'lib/crypto.js' });
    tabs.executeScript(tab.id, { file: 'lib/commit-action.js' });
  }

  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ contexts: ['editable'], title: 'Fill User', id: 'user' });
    chrome.contextMenus.create({ contexts: ['editable'], title: 'User2Clipboard', id: 'cp_user' });
    chrome.contextMenus.create({ contexts: ['editable'], title: 'Fill Pass', id: 'pwd' });
    chrome.contextMenus.create({ contexts: ['editable'], title: 'Pass2Clipboard', id: 'cp_pwd' });
    chrome.contextMenus.create({ contexts: ['page'], title: 'Fill Credentials', id: 'page' });
    chrome.contextMenus.onClicked.addListener(onCtxMenuClick);
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
