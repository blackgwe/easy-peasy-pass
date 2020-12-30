function sendMessage(item) {
  return new Promise((resolve) => chrome.runtime.sendMessage(null, item, null, (_) => resolve(_)));
}

async function deleteSettings() {
  let result = await sendMessage({ action: 'set-settings', settings: {} });
  if (result.success) {
    result = await sendMessage({ action: 'set-master-pass', pass: null, volatile: true });
  }
  alert(result.success ? 'Settings deleted' : 'Error 4712');
}

async function setMasterPass(pwdInput, volatile) {
  await easyPeasyAuth.setSecret(pwdInput ? pwdInput.value : null);
  const cryptoKeyMaster = await easyPeasyAuth.getDerivedPass();
  const expired = new Date().getTime() + easyPeasyAuth.masterKeyHoldTime(cryptoKeyMaster);

  await sendMessage({
    action: 'set-master-pass',
    pass: cryptoKeyMaster,
    volatile,
    expired,
  });
}

function showHelp() {
  let s = `
        'm' … set master password permanently (remember it for 14 days)
        'v' … set master password volatile (don't remember it)
        's' … set site settings permanently
        'f8' … ATTENTION: delete all settings`;

  s = s
    .replace(/ {2}/g, '') // remove leading spaces (double spaces)
    .substr(1); // remove first empty line

  return setTimeout(() => alert(s), 800);
}

// eslint-disable-next-line no-var,no-use-before-define,vars-on-top
var timeoutHandler = timeoutHandler || showHelp();

// eslint-disable-next-line no-var,no-use-before-define,vars-on-top
var choseAction = typeof choseAction !== 'undefined' ? choseAction : (async (event) => {
  if (timeoutHandler) {
    document.removeEventListener('keydown', choseAction);
    clearTimeout(timeoutHandler);
    timeoutHandler = null;
  }

  const pwdInput = document.activeElement.nodeName === 'INPUT' && document.activeElement.type === 'password'
    ? document.activeElement
    : null;

  switch (event.key.toLowerCase()) {
    case 'f8':
      event.preventDefault();
      await deleteSettings();
      break;

    case 'm': // set master and remember 14 days
    case 'v': // volatile master
      event.preventDefault();
      if (!pwdInput) {
        alert('password input field required');
        break;
      }
      if (!pwdInput.value) {
        alert('password required');
        break;
      }

      await setMasterPass(pwdInput, event.key.toLowerCase() === 'v');
      pwdInput.value = '';
      break;

    default:
      break;
  }
});

(() => {
  document.removeEventListener('keydown', choseAction);
  document.addEventListener('keydown', choseAction);
})();
