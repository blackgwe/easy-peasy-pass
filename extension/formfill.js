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
        btn.click();
      }
    }
  }

})();

