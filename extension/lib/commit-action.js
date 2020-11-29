function sendMessagePromise(item) {
  return new Promise((resolve) => chrome.runtime.sendMessage(null, item, null, (_) => resolve(_)));
}

async function getPersistedSettings(secret, salt) {
  await easyPeasyAuth.setSecret(secret, salt);
  const hash = await easyPeasyAuth.getTemplateHash();
  const settings = {};
  settings[hash] = await sendMessagePromise({ action: 'get-site-settings', hash });
  return settings;
}

function getPwdInput(form) {
  let result = form.querySelector('input[type="password"]');
  if (!result) {
    result = document.activeElement.nodeName === 'INPUT' && document.activeElement.type === 'password'
      ? document.activeElement
      : document.querySelector('input[type="password"]');
  }
  return result;
}

function getUserInput(form) {
  if (form) {
    const formTextInputEl = form.querySelector('input[type="text"]');
    const formOtherEl = form.querySelector('input:not([type="password"]):not([type="hidden"])');
    return formTextInputEl ?? formOtherEl;
  }
  return document.querySelector('input[type="text"]');
}

(async () => {
  const hostname = window.location.hostname.split('.').slice(-2).join('.');
  const form = document.activeElement.closest('form');
  const pwdInput = getPwdInput(form);
  const userInput = getUserInput(form);
  const commitBtn = form ? form.querySelector('*[type="submit"]') : null;

  const master = (await sendMessagePromise({ action: 'get-master-secret' })).secret;
  if (master === null) {
    alert('Please give the master password first!');
    return;
  }

  const secret = pwdInput.value;
  const salt = master + hostname;
  await easyPeasyAuth.setSettings(await getPersistedSettings(secret, salt));

  userInput.value = userInput ? await easyPeasyAuth.getDerivedUser() : '';
  pwdInput.value = pwdInput ? await easyPeasyAuth.getDerivedPass() : '';

  const js = await easyPeasyAuth.getScript(secret);
  const doCommit = easyPeasyAuth.doImmediatelySubmit() !== false;

  easyPeasyAuth = null;
  if (js.length > 0) {
  // eslint-disable-next-line no-new-func
    (new Function(js))();
  }

  if (doCommit) {
    commitBtn.click();
  }
})();
