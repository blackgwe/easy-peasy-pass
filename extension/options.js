'use strict';

(() => {
    const _runtime = chrome.runtime;
    const _getMySecretBlocks = easyPeasyAuth.getMySecretBlocks;
    const _setSecret = easyPeasyAuth.setSecret;
    const _getDerivedPass = easyPeasyAuth.getDerivedPass;
    const _masterKeyHoldTime = easyPeasyAuth.masterKeyHoldTime;

    function sendMessage(item) {
        return new Promise((resolve) => _runtime.sendMessage(null, item, null, _ => resolve(_)));
    }

    let transferSettings = {};

    async function getMySecretBlocks(salt) {
        return _getMySecretBlocks(true, true, salt);
    }

    (async () => document.getElementById('user-name').value = await sendMessage({'action': 'get-user'}))();

    async function getRow(transfer, idx) {

        const userName = document.createElement('input');
        userName.setAttribute('type', 'text');
        userName.setAttribute('disabled', 'disabled');
        userName.setAttribute('size', '20');
        userName.setAttribute('value', transfer.name);

        const code = userName.cloneNode();
        code.setAttribute('value', await getMySecretBlocks(transfer.name));
        code.setAttribute('size', '11');

        const submitBtn = document.createElement('button');
        submitBtn.setAttribute('type', 'submit');
        submitBtn.setAttribute('data-idx', `${idx}`);
        submitBtn.classList.add('delBtn');
        submitBtn.innerText = 'Remove';
        submitBtn.addEventListener('click', async (_) => {
            transferSettings.splice(_.target.dataset.idx, 1);
            await sendMessage({
                 'action': 'set-transfer-settings',
                 'transferSettings': transferSettings
            });
            updateTransfers();
        });

        const div = document.createElement('div');
        div.appendChild(document.createElement('br'));
        div.appendChild(userName);
        div.appendChild(document.createTextNode(' '));
        div.appendChild(code);
        div.appendChild(document.createTextNode(' '));
        div.appendChild(submitBtn);

        return div;
    }

    function updateTransfers() {
        _runtime.sendMessage(null, {'action': 'get-transfer-settings'}, null, async (_) => {
            if (_ === undefined) return;

            const transferUsersNode = document.getElementById('transfer-users');
            // remove all child nodes
            let node = transferUsersNode.childNodes[0];
            while (node) {
                transferUsersNode.removeChild(node);
                node = transferUsersNode.childNodes[0];
            }
            // add all transfer as child nodes
            let idx = 0;
            for (let transfer of _) {
                transferUsersNode.appendChild(
                    await getRow(transfer, idx++)
                );
            }
            transferSettings = _;
        });
    }

    document.getElementById('transferName').addEventListener('keyup', async (_) => {
        const
            myTransferCodeInput = document.getElementById('myTransferCode'),
            transferNameInput = document.getElementById('transferName');

        myTransferCodeInput.setAttribute('value', _.target.value ? await getMySecretBlocks(_.target.value) : '');
    });

    document.getElementById('addBtn').addEventListener('click', async () => {
        transferSettings.push({
            name: document.getElementById('transferName').value,
            code: document.getElementById('transferCode').value
        });

        await sendMessage({
            'action': 'set-transfer-settings',
            'transferSettings': transferSettings
        });

        updateTransfers();
    });

    document.getElementById('setUserBtn').addEventListener('click', async () => {

        const user = document.getElementById('user-name').value;
        const result = await sendMessage({
            'action': 'set-master-user',
            'value': user
        });

        alert(result.text);
    });

    const setMasterPassword = async (_) => {
        const value = document.getElementById('pass').value;
        const volatile = _.target.value === 'set';
        await _setSecret(value);
        const cryptoKeyMaster = await _getDerivedPass();
        const expired = new Date().getTime() + _masterKeyHoldTime(cryptoKeyMaster);

        const result = await sendMessage({
            'action': 'set-master-pass',
            'pass': value ? cryptoKeyMaster : '',
            'volatile': volatile,
            'expired': expired
        });

        alert(result.text);
    };

    document.getElementById('setPassBtn').addEventListener('click', setMasterPassword);
    document.getElementById('setPassVolatileBtn').addEventListener('click', setMasterPassword);

    updateTransfers();
})();

chrome = null;
easyPeasyAuth = null;