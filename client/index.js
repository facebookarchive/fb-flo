/*global Session:false, logger:false*/
/* jshint evil:true */

(function() {
  'use strict';

  var log = logger('index');
  log('booting');

  var started = false;
  var config = {
    hostnames: [],
    port: 8888
  };

  function loadConfig() {
    try {
      var conf = JSON.parse(localStorage.getItem('flo-config'));
      if (!conf) return;
      confing = conf;
      config.hostnames = config.hostnames.map(function(pattern) {
        var m = pattern.match(/^\/(.+)\/([gim]{0,3})$/);
        if (m && m[1]) {
          return new RegExp(m[1], m[2]);
        } else {
          return pattern;
        }
      });
    } catch (e) {
      return;
    }
  }

  chrome.devtools.panels.create(
    'flo',
    '',
    'configure/configure.html',
    function (panel) {
      panel.onShown.addListener(function(panelWindow) {
        panelWindow.addEventListener('config_changed', function () {
          if (!started) {
            init();
          }
        });
      });
    }
  );

  function init() {
    loadConfig();

    chrome.devtools.inspectedWindow['eval'](
      '({ host: location.hostname, href: location.href })',
      function (result) {
        for (var i = 0; i < config.hostnames.length; i++) {
          var pattern = config.hostnames[i];
          var matched = false;
          if (pattern instanceof RegExp) {
            matched = pattern.exec(result.host);
          } else {
            matched = pattern === result.host;
          }
          if (matched) {
            (new Session(result, config.port)).start();
            started = true;
          }
        }
      }
    );
  }

  init();
})();
