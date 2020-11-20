timeoutHandler = setTimeout(() => alert(`
        'm' … set master password permanently (remember it for 14 days)
        'v' … set master password volatile (don't remember it)
        's' … set site settings permanently
        'f8' … ATTENTION: delete all settings`
    .replace(/ {2}/g, '') // remove leading spaces (double spaces)
    .substr(1) // remove first empty line
), 800);

choseAction = typeof choseAction !== "undefined" ? choseAction : (async (event) => {

    function sendMessage(item) {
        return new Promise((resolve) => chrome.runtime.sendMessage(null, item, null, _ => resolve(_)));
    }

    event.preventDefault();

    if (timeoutHandler) {
        document.removeEventListener('keydown', choseAction);
        clearTimeout(timeoutHandler);
        timeoutHandler = null;
    }

    const pwdInput = document.activeElement.nodeName === 'INPUT' && document.activeElement.type === 'password'
        ? document.activeElement
        : null;

    const secretInputVal = pwdInput ? pwdInput.value : null;

    switch (event.key.toLowerCase()) {
        case 'f8':
            const result = await sendMessage({'action': 'set-settings', 'settings': {}})
            alert(result.success ? 'Settings deleted' : 'Error 4712');
            break;

        case 'm': // set master and remember 14 days
        case 'v': // volatile master
            if (!pwdInput) {
                alert('password input field required');
                break;
            } else if (!pwdInput.value) {
                alert('password required');
                break;
            }

            await easyPeasyAuth.setSecret(secretInputVal);

            const cryptoKeyMaster = await easyPeasyAuth.getDerivedPass();
            const expired = new Date().getTime() + easyPeasyAuth.masterKeyHoldTime(cryptoKeyMaster);

            await sendMessage({
                'action': 'set-master-pass',
                'pass': cryptoKeyMaster,
                'volatile': event.key.toLowerCase() === 'v',
                'expired': expired
            });

            pwdInput.value = '';
            break;
    }
});

(() => {
    document.removeEventListener('keydown', choseAction);
    document.addEventListener('keydown', choseAction);
})();