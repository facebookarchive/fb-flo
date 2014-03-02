/*global Session:false, logger:false*/
/* jshint evil:true */

(function() {
  'use strict';

  var log = logger('index');

  function FloClient() {
    log('booting');
    this.loadConfig();
    this.session = null;
    this.panelWindow = null;
    this.panelEventBuffer = [];
    this.status = this.status.bind(this);
    this.startNewSession = this.startNewSession.bind(this);
    this.createPanel();
    this.start();
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

    this.config =  config;
  };

  FloClient.prototype.saveConfig = function() {
    localStorage.setItem('flo-config', JSON.stringify(this.config));
  };

  FloClient.prototype.listenToPanel = function(type, callback) {
    if (!this.panelWindow) {
      throw new Error('Panel not found');
    }
    this.panelWindow.addEventListener('flo_' + type, callback.bind(this));
  };

  FloClient.prototype.triggerEvent = function (type, data) {
    var event = new Event('flo_' + type);
    event.data = data;
    if (this.panelWindow) {
      this.panelWindow.dispatchEvent(event);
    } else {
      this.panelEventBuffer.push(event);
    }
    return event;
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
          self.bindPanelEvents();
        });
      }
    );
  };

  FloClient.prototype.bindPanelEvents = function() {
    this.listenToPanel('config_changed', function() {
      this.loadConfig();
      this.startNewSession();
    });
    this.listenToPanel('retry', this.startNewSession);
    this.listenToPanel('enable_for_host', this.enableForHost);
    this.panelEventBuffer.forEach(function(event) {
      this.panelWindow.dispatchEvent(event);
    }, this);
    this.panelEventBuffer = [];
  };

  FloClient.prototype.start = function() {
    this.status('starting');
    this.startNewSession();
  };


  FloClient.prototype.stop = function() {
    this.session.destroy();
    this.session = null;
  };

  FloClient.prototype.getLocation = function(callback) {
    chrome.devtools.inspectedWindow['eval'](
      '({ host: location.hostname, href: location.href })',
      callback.bind(this)
    );
  };

  FloClient.prototype.matchHost = function(host) {
    var config = this.config;
    for (var i = 0; i < config.hostnames.length; i++) {
      var pattern = config.hostnames[i];
      var matched = false;
      if (pattern instanceof RegExp) {
        matched = pattern.exec(host);
      } else {
        matched = pattern === host;
      }
      if (matched) return true;
    }
    return false;
  };

  FloClient.prototype.startNewSession = function() {
    if (this.session) {
      this.stop();
    }

    this.getLocation(
      function (result) {
        if (this.matchHost(result.host)) {
          this.session = new Session(result, this.config.port, this.status);
          this.session.start();
        } else {
          this.status('disabled');
        }
      }
    );
  };

  FloClient.prototype.enableForHost = function() {
    this.getLocation(function(result) {
      console.log(arguments);
      if (!this.matchHost(result.host)) {
        this.config.hostnames.push(result.host);
        this.saveConfig();
        this.startNewSession();
      }
    });
  };

  FloClient.prototype.status = function(status, aux) {
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

    this.triggerEvent('status_change', {
      type: status,
      text: text,
      action: action
    });
  };

  new FloClient();
})();
