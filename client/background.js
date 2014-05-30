chrome.runtime.onMessage.addListener(function(message, sender, callback){
  'use strict';
  if (message.name === 'localStorage:get') {
    callback(localStorage[message.key] || '{}');
  } else if(message.name === 'localStorage:set') {
    localStorage[message.key] = message.data;
  }
});
