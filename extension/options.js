'use strict';

const
  storage = chrome.storage.local,
  resetButton = document.querySelector('button.reset'),
  submitButton = document.querySelector('button.submit'),
  textarea = document.querySelector('textarea');

loadChanges();

submitButton.addEventListener('click', saveChanges);
resetButton.addEventListener('click', reset);

function saveChanges() {
  const value = textarea.value;

  if (!value) {
    notify('Error: No value specified');
    return;
  }

  storage.set({'settings': value}, function() {
    notify('Settings saved');
  });
}

function loadChanges() {
  storage.get('settings', function(item) {
    if (item.settings) {
      textarea.value = item.settings;
      notify('Loaded saved value.');
    }
  });
}

function reset() {
  storage.remove('settings', function(items) {
    notify('Reset stored settings');
  });
  textarea.value = '';
}

function notify(msg) {
  var message = document.querySelector('.message');
  message.innerText = msg;
  setTimeout(function () {
    message.innerText = '';
  }, 3000);
}


const page = document.getElementById('buttonDiv');
const kButtonColors = ['#3aa757', '#e8453c', '#f9bb2d', '#4688f1'];

function constructOptions(kButtonColors) {
  for (let item of kButtonColors) {
    let button = document.createElement('button');
    button.style.backgroundColor = item;
    button.addEventListener('click', function() {
      chrome.storage.sync.set({color: item}, function() {
        console.log('color is ' + item);
      })
    });
    page.appendChild(button);
  }
}

console.log(page),
  constructOptions(kButtonColors);
