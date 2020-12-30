if (typeof chrome === 'undefined') {
  throw new Error('E@syPe@syP@ss is a chrome extension');
}

(() => {
  // UI state handling
  const SHOW_VIEW = 1;
  const EDIT_VIEW = 2;
  const IMPORT_VIEW = 3;

  const INITIAL_STATE_EDIT = {
    view: EDIT_VIEW,
    siteSettings: null,
    templateMatch: false,
  };

  const INITIAL_STATE_SHOW = {
    view: SHOW_VIEW,
    changed: false,
    siteSettings: null,
    templateMatch: false, // true, if the template hash matches an already persisted ones.
  };

  const INITIAL_STATE_IMPORT = {
    view: IMPORT_VIEW,
    changed: false,
    siteSettings: null,
  };

  let state = INITIAL_STATE_EDIT;
  let master = null;
  let site = null;

  // ensure access to chrome/easyPeasyAuth functions (will be set to null at the end of this script)
  const { getMySecretBlocks } = easyPeasyAuth;
  const { getCorrectionUser } = easyPeasyAuth;
  const { getCorrectionPass } = easyPeasyAuth;
  const { getTemplateHash } = easyPeasyAuth;
  const { setSettings } = easyPeasyAuth;
  const { setSecret } = easyPeasyAuth;
  const { encrypt } = easyPeasyAuth;
  const { decrypt } = easyPeasyAuth;
  const { getDerivedUser } = easyPeasyAuth;
  const { getDerivedPass } = easyPeasyAuth;
  const getSelectedTab = chrome.tabs.getSelected;
  const chromeSendMessage = chrome.runtime.sendMessage;
  const { clipboard } = navigator;
  const sendMessage = (item) => new Promise((resolve) => chromeSendMessage(null, item, null, (_) => resolve(_)));

  // simplify access to dom nodes
  const p = {
    site: document.getElementById('site'),
    siteShow: document.getElementById('site-show'),
  };
  const input = {
    targetUser: document.getElementById('site-target-user'),
    targetPass: document.getElementById('site-target-pass'),
    settings: document.getElementById('settings'),
    settingsShow: document.getElementById('settings-show'),
    siteSecret: document.getElementById('site-secret'),
    siteSecretShow: document.getElementById('site-secret-show'),
    selectTemplate: document.getElementById('select-template'),
    selectImport: document.getElementById('select-import'),
    selectExport: document.getElementById('select-export'),
    displayPwd: document.getElementById('display-pwd')
  };
  const btn = {
    edit: document.getElementById('btn-create'),
    show: document.getElementById('btn-show'),
    import: document.getElementById('btn-import'),
    options: document.getElementById('btn-options'),
    save: document.getElementById('btn-save'),
    removeSitePass: document.getElementById('btn-remove-site-pass'),
    saveChanges: document.getElementById('btn-save-changes'),
    export: document.getElementById('btn-export'),
    decryptImportSave: document.getElementById('btn-decrypt-import-save'),
  };
  const div = {
    mapping: document.getElementById('div-mapping'),
    show: document.getElementById('div-show'),
    import: document.getElementById('div-import'),
  };
  const section = {
    showSettings: document.getElementById('show-settings'),
    editSettings: document.getElementById('site-section'),
    importSettings: document.getElementById('import-section'),
  };

  // Utility functions
  const jsonStr = (obj) => JSON.stringify(obj, null, 1);
  const hide = (elements) => elements.map((el) => el.classList.add('d-none'));
  const show = (elements) => elements.map((el) => (el === null ? null : el.classList.remove('d-none')));
  const deriveSecret = (secret) => setSecret(secret, master + site);

  // visibilities of input control elements grouped by UI state = {SHOW_VIEW, EDIT_VIEW}
  const HIDDEN_CONTROLS_IMPORT_VIEW = [
    section.showSettings,
    section.editSettings,
    div.show,
    btn.save,
  ];
  const VISIBLE_CONTROLS_IMPORT_VIEW = [
    div.import,
    section.importSettings,
  ];
  const HIDDEN_CONTROLS_SHOW_VIEW = [
    section.importSettings,
    section.editSettings,
    div.import,
    div.show,
    btn.save,
  ];
  const VISIBLE_CONTROLS_SHOW_VIEW = [
    section.showSettings,
  ];
  const HIDDEN_CONTROLS_EDIT_VIEW = [
    section.importSettings,
    section.showSettings,
    div.import,
    div.show,
  ];
  const VISIBLE_CONTROLS_EDIT_VIEW = [
    section.editSettings,
    div.mapping,
    btn.save,
  ];

  async function enableBtn(buttons) {
    buttons.forEach((el) => {
      el.classList.remove('disabled');
      el.parentElement.classList.remove('disabled');
    });
  }

  async function disableBtn(button) {
    button.classList.add('disabled');
    button.parentElement.classList.add('disabled');
  }

  // Derivation of a common shared secret for importing / exporting encrypted credentials
  // depending on input.selectImport
  async function getSharedSecret(selectElement) {
    const transfer = await sendMessage({ action: 'get-transfer-settings' });
    const idx = selectElement.value;
    return idx < 0
      ? getMySecretBlocks(master, false, 'SHARED_SECRET') // long secret derived from master key
      : getMySecretBlocks(master, true, transfer[idx].name); // short secret derived from master key + the transfer name
  }

  // show hide UI controls according to state
  async function render() {
    await enableBtn([btn.edit, btn.show, btn.import]);
    switch (state.view) {
      case IMPORT_VIEW:
        await disableBtn(btn.import);
        hide(HIDDEN_CONTROLS_IMPORT_VIEW);
        show(VISIBLE_CONTROLS_IMPORT_VIEW);
        input.siteSecretShow.focus();
        input.settingsShow.value = state.siteSettings !== null ? jsonStr(state.siteSettings) : '';
        break;
      case SHOW_VIEW:
        await disableBtn(btn.show);
        hide(HIDDEN_CONTROLS_SHOW_VIEW);
        show(VISIBLE_CONTROLS_SHOW_VIEW.concat(state.templateMatch ? div.show : null));
        input.siteSecretShow.focus();
        input.settingsShow.value = state.siteSettings !== null ? jsonStr(state.siteSettings) : '';
        break;
      case EDIT_VIEW:
        await disableBtn(btn.edit);
        hide(HIDDEN_CONTROLS_EDIT_VIEW);
        show(VISIBLE_CONTROLS_EDIT_VIEW);
        if (state.changed) {
          btn.save.removeAttribute('disabled');
        } else {
          btn.save.setAttribute('disabled', 'disabled');
        }

        await deriveSecret(input.siteSecret.value);
        state.siteSettings = Object.assign(
          state.siteSettings ? state.siteSettings : {},
          input.targetUser.value ? { user_correct: getCorrectionUser(input.targetUser.value) } : {},
          input.targetPass.value ? { pass_correct: getCorrectionPass(input.targetPass.value) } : {},
          input.selectTemplate.value !== '24×simple' ? { template: input.selectTemplate.value } : {},
        );

        input.settings.value = state.siteSettings !== null ? jsonStr(state.siteSettings) : '';
        break;
      default:
        throw new Error(`unknown state ${state ? state.view : state}`);
    }
  }

  function inputSettingsKeyUp() {
    const settings = document.getElementById('settings');
    state.siteSettings = JSON.parse(settings.value);
    if (input.settings.value.match(/"user":/) || input.settings.value.match(/"pass":/)) {
      show([div.import]);
      btn.save.setAttribute('disabled', 'disabled');
    } else {
      hide([div.import]);
      btn.save.removeAttribute('disabled');
    }
  }

  async function updateInput(ev) {
    const settings = JSON.parse(input.settings.value);
    const delPressed = (ev.code === 'Backspace' || ev.code === 'Delete');

    if (delPressed && ev.target === input.targetUser && !input.targetUser.value) {
      delete settings.user_correct;
    }
    if (delPressed && ev.target === input.targetPass && !input.targetPass.value) {
      delete settings.pass_correct;
    }
    if (ev.target === input.selectTemplate && input.selectTemplate.value === '24×simple') {
      delete settings.template;
    }

    state = Object.assign(state, { changed: true, siteSettings: settings });
    await render();
  }

  async function siteSecretSelected() {
    await deriveSecret(input.siteSecretShow.value);
    const siteSettings = await sendMessage({
      action: 'get-site-settings',
      hash: await getTemplateHash(),
    });
    const decryptComments = async (obj) => {
      for (const prop in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, prop)) {
          if (prop.match(/^(__comment_|script|site)/)) {
            // eslint-disable-next-line no-param-reassign
            obj[prop] = await decrypt(input.siteSecretShow.value, obj[prop]);
          } else if (typeof obj[prop] === 'object') {
            await decryptComments(obj[prop]);
          }
        }
      }
    };
    await decryptComments(siteSettings);
    state = { ...INITIAL_STATE_SHOW };
    state.siteSettings = siteSettings;
    state.templateMatch = siteSettings !== null;
    await render();
  }

  getSelectedTab(null, async (tab) => {
    site = new URL(tab.url).hostname.split('.').slice(-2).join('.');
    p.site.textContent = site;
    p.siteShow.textContent = site;
    btn.options.setAttribute('href', `options.html?site=${site}`);
    await render();
  });

  async function createBtnClick() {
    input.targetPass.value = '';
    input.targetUser.value = '';
    input.siteSecret.value = '';
    state = { ...INITIAL_STATE_EDIT };
    state.siteSettings = { site };
    await render();
    input.siteSecret.focus();
  }

  async function showBtnClick() {
    state = { ...INITIAL_STATE_SHOW };
    await siteSecretSelected();
  }

  async function importBtnClick() {
    state = { ...INITIAL_STATE_IMPORT };
    input.settings.value = '';
    await render();
  }

  async function saveBtnClick() {
    const encryptComments = async (obj) => {
      for (const prop in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, prop)) {
          if (prop.match(/^(__comment_|script|site)/)) {
            // eslint-disable-next-line no-param-reassign
            obj[prop] = await encrypt(input.siteSecret.value, obj[prop]);
          } else if (typeof obj[prop] === 'object') {
            await encryptComments(obj[prop]);
          }
        }
      }
    };
    const siteSettings = JSON.parse(state.view === EDIT_VIEW ? input.settings.value : input.settingsShow.value);
    siteSettings.ts = new Date().toISOString();
    await encryptComments(siteSettings);
    await sendMessage({
      action: 'set-site-settings',
      siteSettings: { [getTemplateHash()]: siteSettings },
    });
    input.siteSecretShow.value = input.siteSecret.value;
    state.view = SHOW_VIEW;
    await siteSecretSelected();
  }

  async function removeBtnClick() {
    await sendMessage({
      action: 'remove-site',
      hash: getTemplateHash(),
    });
    input.siteSecretShow.value = '';
    await siteSecretSelected();
  }

  // noinspection JSUnusedLocalSymbols
  /*
  async function uploadBtnClick() {
    // idea is to upload backups && maybe sync
    fetch('https://api.github.com/users/blackgwe/repos')
      .then((response) => response.json())
      .then((data) => alert(data.length));
  }
  */

  async function exportBtnClick() {
    // step 1: set the unencrypted credentials
    const settings = state.siteSettings;
    const exportValue = { site };
    await setSettings((await sendMessage({ action: 'get-settings' })).settings);
    await deriveSecret(input.siteSecretShow.value);
    exportValue.user = await getDerivedUser();
    exportValue.pass = await getDerivedPass();
    if (settings.script) {
      exportValue.script = settings.script;
    }
    if (settings.template) {
      exportValue.template = settings.template;
    }
    // step 2: symmetric encrypt
    const encryptData = async (obj, secret) => {
      for (const prop in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, prop)) {
          // eslint-disable-next-line no-param-reassign
          obj[prop] = await encrypt(secret, obj[prop]);
        }
      }
    };
    await encryptData(exportValue, await getSharedSecret(input.selectExport));
    await clipboard.writeText(jsonStr(exportValue));
    alert('Encrypted credentials copied to clipboard');
  }

  async function decryptImportSaveBtnClick() {
    const importValue = JSON.parse(input.settings.value);
    const decryptData = async (obj, secret) => {
      for (const prop in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, prop)) {
          if (prop.match(/^(site|pass|user|script|template)/)) {
            // eslint-disable-next-line no-param-reassign
            obj[prop] = await decrypt(secret, obj[prop]);
          } else if (typeof obj[prop] === 'object') {
            await decryptData(obj[prop], secret);
          }
        }
      }
    };
    await decryptData(importValue, await getSharedSecret(input.selectImport));

    if (site !== importValue.site) {
      alert(`Settings of "${importValue.site}" cannot be imported to "${site}"`);
      return;
    }

    input.siteSecret.value = '';
    input.targetUser.value = importValue.user || '';
    input.targetPass.value = importValue.pass || '';
    input.selectTemplate.value = importValue.template || '24×simple';
    state = { ...INITIAL_STATE_EDIT };
    state.siteSettings = { site };
    state.changed = true;
    await render();
    input.siteSecret.focus();
  }

  document.addEventListener('DOMContentLoaded', async () => {
    input.siteSecretShow.addEventListener('keyup', siteSecretSelected);
    input.siteSecret.addEventListener('keyup', updateInput);
    input.targetUser.addEventListener('keyup', updateInput);
    input.targetPass.addEventListener('keyup', updateInput);
    input.selectTemplate.addEventListener('input', updateInput);
    input.settings.addEventListener('input', inputSettingsKeyUp);
    btn.removeSitePass.addEventListener('click', removeBtnClick);
    btn.save.addEventListener('click', saveBtnClick);
    btn.saveChanges.addEventListener('click', saveBtnClick);
    btn.edit.addEventListener('click', createBtnClick);
    btn.show.addEventListener('click', showBtnClick);
    btn.import.addEventListener('click', importBtnClick);
    btn.export.addEventListener('click', exportBtnClick);
    btn.decryptImportSave.addEventListener('click', decryptImportSaveBtnClick);
    input.displayPwd.addEventListener('change', (ev) => document
      .querySelectorAll('input[data-pass="1"]')
      .forEach((f) => f.setAttribute('type', ev.target.checked ? 'text' : 'password')));

    const transferSettings = await sendMessage({ action: 'get-transfer-settings' });
    for (const selectNode of [input.selectExport, input.selectImport]) {
      let idx = 0;
      for (const transfer of transferSettings) {
        const optionEl = document.createElement('option');
        optionEl.setAttribute('value', `${idx++}`);
        optionEl.innerText = transfer.name;
        selectNode.appendChild(optionEl);
      }
    }
  });

  // site options can only be set, if master password is set already
  (async () => {
    const masterObj = (await sendMessage({ action: 'get-master-secret' }));
    if (!masterObj || !masterObj.secret) {
      alert('Please give the master password first!');
      btn.options.click();
    } else {
      master = masterObj.secret;
      await createBtnClick();
    }
    document.querySelector('body').classList.remove('d-none');
  })();
})();

chrome = null;
easyPeasyAuth = null;
