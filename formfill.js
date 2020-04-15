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
    pwdInput.value = "ccah3oC2";
    if (userInput) {
      userInput.value = 'gabriel';
      if (btn) {
        btn.click();
      }
    }
  }

})();

