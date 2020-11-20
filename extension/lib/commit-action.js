(async () => {
    const
        hostname = window.location.hostname.split('.').slice(-2).join('.'),
        form = document.activeElement.closest('form'),
        pwdInput = form
            ? form.querySelector('input[type="password"]')
            : (document.activeElement.nodeName === 'INPUT' && document.activeElement.type === 'password'
                    ? document.activeElement
                    : document.querySelector('input[type="password"]')
            ),

        userInput = form
            ? (form.querySelector('input[type="text"]') ?? form.querySelector('input:not([type="password"]):not([type="hidden"])'))
            : document.querySelector('input[type="text"]'),

        commitBtn = form.querySelector('*[type="submit"]');

    const
        master = (await easyPeasyAuth.sendMessagePromise({'action': 'get-master-secret'})).secret,
        secret = pwdInput.value,
        salt = master + hostname;

    if (master === null) {
        alert('Please give the master password first!');
        return;
    }

    await easyPeasyAuth.setSecret(secret, salt);

    userInput.value = userInput ? await easyPeasyAuth.getDerivedUser() : '';
    pwdInput.value = pwdInput ? await easyPeasyAuth.getDerivedPass() : '';

    const js = await easyPeasyAuth.getScript(secret);
    const doCommit = easyPeasyAuth.doImmediatelySubmit() !== false;

    easyPeasyAuth = null;
    if (js.length > 0) {
        (new Function(js))();
    }

    if (doCommit) {
        commitBtn.click();
    }
})();