chrome = chrome || {};
chrome.tabs = chrome.tabs || {};
chrome.tabs.getSelected = chrome.tabs.getSelected || (() => console.error('e@syPe@syP@ss is a chrome extension'));
chrome.runtime = chrome.runtime || {};
chrome.runtime.sendMessage = chrome.runtime.sendMessage || (() => console.error('e@syPe@syP@ss is a chrome extension'));

(() => {
    // ensure access to chrome/easyPeasyAuth functions (will be set to null at the end of this script)
    const
        getMySecretBlocks = easyPeasyAuth.getMySecretBlocks,
        getCorrectionUser = easyPeasyAuth.getCorrectionUser,
        getCorrectionPass = easyPeasyAuth.getCorrectionPass,
        getTemplateHash = easyPeasyAuth.getTemplateHash,
        setSettings = easyPeasyAuth.setSettings,
        setSecret = easyPeasyAuth.setSecret,
        encrypt = easyPeasyAuth.encrypt,
        decrypt = easyPeasyAuth.decrypt,
        getDerivedUser = easyPeasyAuth.getDerivedUser,
        getDerivedPass = easyPeasyAuth.getDerivedPass,
        getSelectedTab = chrome.tabs.getSelected,
        chromeSendMessage = chrome.runtime.sendMessage,
        clipboard = navigator.clipboard,
        sendMessage = (item) => new Promise((resolve) => chromeSendMessage(null, item, null, _ => resolve(_)));

    // simplify access to dom nodes
    const
        p = {
            site: document.getElementById('site')
        },
        input = {
            targetUser: document.getElementById('site-target-user'),
            targetPass: document.getElementById('site-target-pass'),
            settings: document.getElementById('settings'),
            settingsX1: document.getElementById('settings-x1'),
            siteSecret: document.getElementById('site-secret'),
            siteSecretX1: document.getElementById('site-secret-x1'),
            selectTemplate: document.getElementById('select-template'),
            selectImport: document.getElementById('select-import'),
            selectExport: document.getElementById('select-export'),
            displayPwd: document.getElementById('display-pwd')
        },
        btn = {
            create: document.getElementById('btn-create'),
            save: document.getElementById('btn-save'),
            cancel: document.getElementById('btn-cancel'),
            removeSitePass: document.getElementById('btn-remove-site-pass'),
            export: document.getElementById('btn-export'),
            import: document.getElementById('btn-import')
        },
        div = {
            mapping: document.getElementById('div-mapping'),
            export: document.getElementById('div-export'),
            import: document.getElementById('div-import')
        },
        section = {
            showSettings: document.getElementById('show-settings'),
            editSettings: document.getElementById('site-section')
        };

    // Utility functions
    const jsonStr = (obj) => JSON.stringify(obj, null, 1);
    const hide = (elements) => elements.map((el) => el.classList.add('d-none'));
    const show = (elements) => elements.map((el) => el === null ? null : el.classList.remove('d-none'));
    const deriveSecret = (secret) => setSecret(secret, master + site)

    // visibilities of input control elements grouped by UI state = {SHOW_VIEW, EDIT_VIEW}
    const HIDDEN_CONTROLS_SHOW_VIEW = [
        section.editSettings,
        div.import,
        div.export,
        btn.removeSitePass,
        btn.save,
        btn.cancel,
    ];
    const VISIBLE_CONTROLS_SHOW_VIEW = [
        section.showSettings,
        btn.create,
    ];
    const HIDDEN_CONTROLS_EDIT_VIEW = [
        section.showSettings,
        btn.removeSitePass,
        btn.create,
        div.import,
        div.export,
    ];

    const VISIBLE_CONTROLS_EDIT_VIEW = [
        section.editSettings,
        div.mapping,
        btn.save,
        btn.cancel,
    ];

    // UI state handling
    const SHOW_VIEW = 1;
    const EDIT_VIEW = 2;

    const INITIAL_STATE_EDIT = {
        view: EDIT_VIEW,
        siteSettings: null,
        templateMatch: false
    };

    const INITIAL_STATE_SHOW = {
        view: SHOW_VIEW,
        changed: false,
        siteSettings: null,
        templateMatch: false // true, if the template hash matches an already persisted ones.
    };

    let state = INITIAL_STATE_SHOW;
    let master = null;
    let site = null;

    // Derivation of a common shared secret for importing / exporting encrypted credentials depending on input.selectImport
    async function getSharedSecret(selectElement) {
        const transfer = await sendMessage({'action': 'get-transfer-settings'});
        const idx = selectElement.value;
        return idx < 0
            ? await getMySecretBlocks(master, false, 'SHARED_SECRET') // long secret derived from master key
            : await getMySecretBlocks(master, true, transfer[idx].name); // short secret derived from master key + the transfer name
    }

    // show hide UI controls according to state
    async function render() {
        switch (state.view) {
            case SHOW_VIEW:
                hide(HIDDEN_CONTROLS_SHOW_VIEW);
                show(VISIBLE_CONTROLS_SHOW_VIEW.concat(
                    state.templateMatch ? div.export : null,
                    state.templateMatch ? btn.removeSitePass : null
                ));
                input.siteSecretX1.focus();
                input.settingsX1.value = state.siteSettings !== null ? jsonStr(state.siteSettings) : '';
                break
            case EDIT_VIEW:
                hide(HIDDEN_CONTROLS_EDIT_VIEW);
                show(VISIBLE_CONTROLS_EDIT_VIEW);
                if (state.changed) {
                    btn.save.removeAttribute("disabled");
                } else {
                    btn.save.setAttribute("disabled", "disabled");
                }

                await deriveSecret(input.siteSecret.value);
                state.siteSettings = Object.assign(
                    state.siteSettings ? state.siteSettings : {},
                    input.targetUser.value ? {"user_correct": getCorrectionUser(input.targetUser.value)} : {},
                    input.targetPass.value ? {"pass_correct": getCorrectionPass(input.targetPass.value)} : {},
                    input.selectTemplate.value !== '24×simple' ? {"template": input.selectTemplate.value} : {}
                );

                input.settings.value = state.siteSettings !== null ? jsonStr(state.siteSettings) : '';
                break;
        }
    }

    async function createBtnClick() {
        input.targetPass.value = '';
        input.targetUser.value = '';
        input.siteSecret.value = '';
        state = Object.assign({}, INITIAL_STATE_EDIT);
        state.siteSettings = {
            site: site
        };
        await render();
        input.siteSecret.focus();
    }

    async function cancelBtnClick() {
        input.siteSecret.value = '';
        input.targetPass.value = '';
        input.targetUser.value = '';
        state = INITIAL_STATE_SHOW;
        await siteSecretSelected();
    }

    async function saveBtnClick() {
        const encryptComments = async (obj) => {
            for (let prop in obj) {
                if (obj.hasOwnProperty(prop)) {
                    if (prop.match(/^(__comment_|script|site)/)) {
                        obj[prop] = await encrypt(input.siteSecret.value, obj[prop]);
                    } else if (typeof obj[prop] === 'object') {
                        await encryptComments(obj[prop]);
                    }
                }
            }
        }
        const siteSettings = JSON.parse(input.settings.value);
        siteSettings.ts = new Date().toISOString();
        await encryptComments(siteSettings);
        await sendMessage({
            'action': 'set-site-settings',
            'siteSettings': {[getTemplateHash()]: siteSettings}
        });
        input.siteSecretX1.value = input.siteSecret.value;
        state.view = SHOW_VIEW;
        await siteSecretSelected();
    }

    async function removeBtnClick() {
        await sendMessage({
            'action': 'remove-site',
            'hash': getTemplateHash()
        });
        input.siteSecretX1.value = '';
        await siteSecretSelected();
    }

    // noinspection JSUnusedLocalSymbols
    async function uploadBtnClick() {
        // idea is to upload backups && maybe sync
        fetch('https://api.github.com/users/blackgwe/repos')
            .then(response => response.json())
            .then(data => alert(data.length));
    }

    async function exportBtnClick() {
        // step 1: set the unencrypted credentials
        const settings = state.siteSettings;
        const exportValue = {'site': site};
        await setSettings((await sendMessage({'action': 'get-settings'})).settings);
        await deriveSecret(input.siteSecretX1.value);
        if (settings.user_correct) {
            exportValue.user = await getDerivedUser();
        }
        if (settings.pass_correct) {
            exportValue.pass = await getDerivedPass();
        }
        if (settings.script) {
            exportValue.script = settings.script
        }
        if (settings.template) {
            exportValue.template = settings.template
        }
        // step 2: symmetric encrypt
        const encryptData = async (obj, secret) => {
            for (let prop in obj) {
                if (obj.hasOwnProperty(prop)) {
                    obj[prop] = await encrypt(secret, obj[prop]);
                }
            }
        };
        await encryptData(exportValue, await getSharedSecret(input.selectExport));
        await clipboard.writeText(jsonStr(exportValue));
        alert('Encrypted credentials copied to clipboard');
    }

    async function importBtnClick() {
        const importValue = JSON.parse(input.settings.value);
        const decryptData = async (obj, secret) => {
            for (let prop in obj) {
                if (obj.hasOwnProperty(prop)) {
                    if (prop.match(/^(site|pass|user|script|template)/)) {
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
        input.targetUser.value = importValue.user ?? '';
        input.targetPass.value = importValue.pass ?? '';
        input.selectTemplate.value = importValue.template ?? '';
        state = INITIAL_STATE_EDIT;
        state.siteSettings = {site: site};
        state.changed = true;
        await render();
        input.siteSecret.focus();
    }

    function inputSettingsKeyUp(_) {
        const settings = document.getElementById('settings');
        state.siteSettings = JSON.parse(settings.value);
        if (input.settings.value.match(/"user":/) || input.settings.value.match(/"pass":/)) {
            show([div.import]);
            btn.save.setAttribute("disabled", "disabled");
        } else {
            hide([div.import]);
            btn.save.removeAttribute("disabled");
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

        state = Object.assign(state, {changed: true, siteSettings: settings});
        await render();
    }

    async function siteSecretSelected() {
        await deriveSecret(input.siteSecretX1.value);
        let siteSettings = await sendMessage({
            'action': 'get-site-settings',
            'hash': await getTemplateHash()
        });
        const decryptComments = async (obj) => {
            for (let prop in obj) {
                if (obj.hasOwnProperty(prop)) {
                    if (prop.match(/^(__comment_|script|site)/)) {
                        obj[prop] = await decrypt(input.siteSecretX1.value, obj[prop]);
                    } else if (typeof obj[prop] === 'object') {
                        await decryptComments(obj[prop]);
                    }
                }
            }
        }
        await decryptComments(siteSettings);
        state = INITIAL_STATE_SHOW;
        state.siteSettings = siteSettings;
        state.templateMatch = siteSettings !== null;
        await render();
    }

    document.addEventListener('DOMContentLoaded', async function () {
        input.siteSecretX1.addEventListener('keyup', siteSecretSelected);
        input.siteSecret.addEventListener('keyup', updateInput);
        input.targetUser.addEventListener('keyup', updateInput);
        input.targetPass.addEventListener('keyup', updateInput);
        input.selectTemplate.addEventListener('input', updateInput);
        input.settings.addEventListener('input', inputSettingsKeyUp);
        btn.removeSitePass.addEventListener('click', removeBtnClick);
        btn.save.addEventListener('click', saveBtnClick);
        btn.cancel.addEventListener('click', cancelBtnClick);
        btn.create.addEventListener('click', createBtnClick);
        btn.export.addEventListener('click', exportBtnClick);
        btn.import.addEventListener('click', importBtnClick);
        input.displayPwd.addEventListener('change', (ev) => document
            .querySelectorAll('input[data-pass="1"]')
            .forEach((f, _) =>
                f.setAttribute('type', ev.target.checked ? 'text' : 'password')
            )
        );

        const transferSettings = await sendMessage({'action': 'get-transfer-settings'});
        for (let selectNode of [input.selectExport, input.selectImport]) {
            let idx = 0;
            for (let transfer of transferSettings) {
                const optionEl = document.createElement('option');
                optionEl.setAttribute('value', `${idx++}`);
                optionEl.innerText = transfer.name;
                selectNode.appendChild(optionEl);
            }
        }
    });

    getSelectedTab(null, async (tab) => {
        site = new URL(tab.url).hostname.split('.').slice(-2).join('.');
        p.site.textContent = site;
        await render();
    });

    // site options can only be set, if master password is set already
    (async () => {
        master = (await sendMessage({'action': 'get-master-secret'})).secret;
        if (!master) {
            alert('Please give the master password first!');
        } else {
            await siteSecretSelected();
        }

    })();
})();

chrome = null;
easyPeasyAuth = null;