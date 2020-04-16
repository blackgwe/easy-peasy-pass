/**
 {
  "user":"gabriel",
   "template": {
      "length": 32,
      "correct": "dGVzdDU1"
    }
}
 */

(function() {
  let
    form = document.activeElement.closest('form'),

    pwdInput = form
      ? form.querySelector('input[type="password"]')
      : (document.activeElement.nodeName === 'INPUT' && document.activeElement.type === 'password'
          ? pwdInput = document.activeElement
          : document.querySelector('input[type="password"]')
        ),

    userInput = form
      ? form.querySelector('input[type="text"]')
      : null,

    btn = form
      ? form.querySelector('*[type="submit"]')
      : null;

  if (pwdInput) {
    pwdInput.value = "secret-pwd";
    if (userInput) {
      userInput.value = 'user';
      if (btn) {
        // btn.click();
      }
    }
  }

  chrome.storage.local.get('settings', function(keyValue) {
    alert('yeap');
    if (keyValue.settings) {
      const options = JSON.parse(keyValue.settings);
      alert('yeap' + options.user);
      alert('yeap' + options.template.length);
    } else {
      alert('hmmm');
    }
  });
})();

