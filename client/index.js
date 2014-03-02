/*global Session:false, logger:false*/
/* jshint evil:true */

(function() {
  'use strict';

  var log = logger('index');

  function FloClient() {
    log('booting');
    this.config = this.loadConfig();
    this.session = null;
    this.panelWindow = null;
    this.start = this.start.bind(this);
    this.status = this.status.bind(this);
    this.startNewSession = this.startNewSession.bind(this);
    this.createPanel(this.start);
  }

  FloClient.prototype.loadConfig = function() {
    var config;
    try {
      config = JSON.parse(localStorage.getItem('flo-config'));
    } catch (e) {
      // Ignore parse error.
    }
    if (config) {
      config.hostnames = config.hostnames.map(function(pattern) {
        var m = pattern.match(/^\/(.+)\/([gim]{0,3})$/);
        if (m && m[1]) {
          return new RegExp(m[1], m[2]);
        } else {
          return pattern;
        }
      });
    } else {
      config = {
        hostnames: [],
        port: 8888
      };
    }
    return config;
  };

  FloClient.prototype.createPanel = function(callback) {
    var self = this;
    chrome.devtools.panels.create(
      'flo',
      '',
      'configure/configure.html',
      function (panel) {
        panel.onShown.addListener(function(panelWindow) {
          self.panelWindow = panelWindow;
          callback && callback();
        });
      }
    );
  };

  FloClient.prototype.start = function() {
    this.status('starting');
    this.panelWindow.addEventListener('config_changed', this.startNewSession);
    this.startNewSession();
  };


  FloClient.prototype.stop = function() {
    this.session.destroy();
    this.session = null;
  };

  FloClient.prototype.startNewSession = function() {
    if (this.session) {
      this.stop();
    }

    chrome.devtools.inspectedWindow['eval'](
      '({ host: location.hostname, href: location.href })',
      function (result) {
        var config = this.config;
        for (var i = 0; i < config.hostnames.length; i++) {
          var pattern = config.hostnames[i];
          var matched = false;
          if (pattern instanceof RegExp) {
            matched = pattern.exec(result.host);
          } else {
            matched = pattern === result.host;
          }
          if (matched) {
            this.session = new Session(result, config.port, this.status);
            this.session.start();
          } else {
            this.status('disabled');
          }
        }
      }.bind(this)
    );
  };

  FloClient.prototype.status = function(status, aux) {
    if (!this.panelWindow) {
      throw new Error('Expected panel window');
    }

    var text, action;
    switch (status) {
      case 'starting':
        text = 'Starting';
        break;
      case 'disabled':
        text = 'Disabled for this site';
        action = 'enable';
        break;
      case 'connecting':
        text = 'Connecting';
        break;
      case 'connected':
        text = 'Connected';
        break;
      case 'retry':
        text = 'Failed to connect, retrying in ' + (aux / 1000) + 's';
        break;
      case 'error':
        text = 'Error connecting';
        action = 'retry';
        break;
      default:
        throw new Error('Unknown session status.');
    }

    var event = new Event('flo_status_change');
    event.data = {
      type: status,
      text: text,
      action: action
    }
    this.panelWindow.dispatchEvent(event);
  };

  new FloClient();
})();
