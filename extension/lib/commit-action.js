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

function getPwdInput(form, fillPass) {
  let result = document.querySelector(':focus');
  if (fillPass && result) {
    return result;
  }
  if (form) {
    result = form.querySelector('input[type="password"]');
    if (!result) {
      result = document.activeElement.nodeName === 'INPUT' && document.activeElement.type === 'password'
        ? document.activeElement
        : document.querySelector('input[type="password"]');
    }
  }
  return result;
}

function getUserInput(form, fillUser) {
  let result = document.querySelector('input:focus');
  if (fillUser && result) {
    return result;
  }
  result = document.querySelector('input[type="email"]') || result;
  result = document.querySelector('input[type="text"]') || result;
  if (form) {
    const formTextInputEl = form.querySelector('input[type="text"]');
    const formEmailInputEl = form.querySelector('input[type="email"]');
    const formOtherEl = form.querySelector('input:not([type="password"]):not([type="hidden"])');
    result = formTextInputEl || formEmailInputEl || formOtherEl || result;
  }
  return result;
}

function getCommitBtn(form) {
  let result = document.querySelector('*[type="submit"]');
  result = result || document.querySelector('button.primary');
  result = result || document.querySelector('button');
  if (form) {
    result = form.querySelector('*[type="submit"]') || result;
  }
  return result;
}

(async () => {
  const hostname = window.location.hostname.split('.').slice(-2).join('.');
  const form = document.activeElement.closest('form') || document.querySelector('form');
  const hasScriptOption = typeof scriptOptions !== 'undefined';
  const pwdInput = getPwdInput(form, hasScriptOption && scriptOptions.match(/pass/));
  const userInput = getUserInput(form, hasScriptOption && scriptOptions.match(/user/));
  const commitBtn = getCommitBtn(form);
  const master = (await sendMessagePromise({ action: 'get-master-secret' })).secret;

  if (master === null) {
    alert('Please give the master password first!');
    return;
  }

  const secret = pwdInput.value;
  const salt = master + hostname;
  await easyPeasyAuth.setSettings(await getPersistedSettings(secret, salt));

  if (!hasScriptOption || scriptOptions === 'set-user') {
    userInput.value = userInput ? await easyPeasyAuth.getDerivedUser() : '';
  }

  if (!hasScriptOption || scriptOptions === 'set-pass') {
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
  }

  if (hasScriptOption && scriptOptions === 'cp-user') {
    const text = await easyPeasyAuth.getDerivedUser();
    await navigator.clipboard.writeText(text);
  }

  if (hasScriptOption && scriptOptions === 'cp-pass') {
    const text = await easyPeasyAuth.getDerivedPass();
    await navigator.clipboard.writeText(text);
  }

  easyPeasyAuth = null;
})();
