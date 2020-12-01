(() => {
  const { runtime } = chrome;
  const { getMySecretBlocks } = easyPeasyAuth;
  const { setSecret } = easyPeasyAuth;
  const { getDerivedPass } = easyPeasyAuth;
  const { masterKeyHoldTime } = easyPeasyAuth;

  function sendMessage(item) {
    return new Promise((resolve) => runtime.sendMessage(null, item, null, (_) => resolve(_)));
  }

  let transferSettings = {};

  async function getSecretBlocks(salt) {
    return getMySecretBlocks(true, true, salt);
  }

  (async () => {
    document.getElementById('user-name').value = await sendMessage({ action: 'get-user' });
    return undefined;
  })();

  function updateTransfers() {
    runtime.sendMessage(null, { action: 'get-transfer-settings' }, null, async (transfers) => {
      if (transfers === undefined) return;
      const transferUsersNode = document.getElementById('transfer-users');
      // remove all child nodes
      let node = transferUsersNode.childNodes[0];
      while (node) {
        transferUsersNode.removeChild(node);
        node = transferUsersNode.childNodes[0];
      }
      // add all transfer as child nodes
      let idx = 0;
      for (const transfer of transfers) {
        const row = await getRow(transfer, idx++);
        transferUsersNode.appendChild(row);
      }
      transferSettings = transfers;
    });
  }

  async function getRow(transfer, idx) {
    const userName = document.createElement('input');
    userName.setAttribute('type', 'text');
    userName.setAttribute('disabled', 'disabled');
    userName.setAttribute('size', '20');
    userName.setAttribute('value', transfer.name);

    const code = userName.cloneNode();
    code.setAttribute('value', await getSecretBlocks(transfer.name));
    code.setAttribute('size', '11');

    const submitBtn = document.createElement('button');
    submitBtn.setAttribute('type', 'submit');
    submitBtn.setAttribute('data-idx', `${idx}`);
    submitBtn.classList.add('delBtn');
    submitBtn.innerText = 'Remove';
    submitBtn.addEventListener('click', async (_) => {
      transferSettings.splice(_.target.dataset.idx, 1);
      await sendMessage({
        action: 'set-transfer-settings',
        transferSettings,
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

  document.getElementById('transferName').addEventListener('keyup', async (_) => {
    const myTransferCodeInput = document.getElementById('myTransferCode');
    myTransferCodeInput.setAttribute('value', _.target.value ? await getSecretBlocks(_.target.value) : '');
  });

  document.getElementById('addBtn').addEventListener('click', async () => {
    transferSettings.push({
      name: document.getElementById('transferName').value,
      code: document.getElementById('transferCode').value,
    });

    await sendMessage({
      action: 'set-transfer-settings',
      transferSettings,
    });

    updateTransfers();
  });

  document.getElementById('setUserBtn').addEventListener('click', async () => {
    const user = document.getElementById('user-name').value;
    const result = await sendMessage({
      action: 'set-master-user',
      value: user,
    });

    alert(result.text);
  });

  const setMasterPassword = async (_) => {
    const { value } = document.getElementById('pass');
    const volatile = _.target.value === 'set';
    await setSecret(value);
    const cryptoKeyMaster = await getDerivedPass();
    const expired = new Date().getTime() + masterKeyHoldTime(cryptoKeyMaster);

    const result = await sendMessage({
      action: 'set-master-pass',
      pass: value ? cryptoKeyMaster : '',
      volatile,
      expired,
    });

    alert(result.text);
  };

  document.getElementById('setPassBtn').addEventListener('click', setMasterPassword);
  document.getElementById('setPassVolatileBtn').addEventListener('click', setMasterPassword);

  updateTransfers();
})();

chrome = null;
easyPeasyAuth = null;
