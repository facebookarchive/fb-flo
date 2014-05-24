/**
 *  Copyright (c) 2014, Facebook, Inc.
 *  All rights reserved.
 *
 *  This source code is licensed under the BSD-style license found in the
 *  LICENSE file in the root directory of this source tree. An additional grant
 *  of patent rights can be found in the PATENTS file in the same directory.
 */

(function () {

  /**
   * Utils.
   */

  var $ = document.querySelector.bind(document);

  function $$() {
    var els = document.querySelectorAll.apply(document, arguments);
    return [].slice.call(els);
  }

  function triggerEvent(type, data) {
    var event = new Event('flo_' + type);
    event.data = data;
    window.dispatchEvent(event);
    return event;
  };

  function listenToEvent(type, callback) {
    window.addEventListener('flo_' + type, callback);
  }

  /**
   * Navigation.
   */

  $('nav').onclick = function(e) {
    if (e.target.nodeName !== 'LI') return;
    $$('.selected').forEach(function(el) {
      el.classList.remove('selected');
    });
    e.target.classList.add('selected');
    var tabClass = e.target.getAttribute('data-tab');
    var tabEl = $('.' + tabClass);
    tabEl && tabEl.classList.add('selected');
  };

  /**
   * Storage.
   */

  function save() {
    var sites = $$('.hostnames .item span').map(function(el) {
      return {
        pattern: el.dataset.pattern,
        server: el.dataset.server,
        port: el.dataset.port
      };
    });
    var port = $('input[name="default-port"').value.trim();
    triggerEvent('config_changed',{
      port: port,
      sites: sites
    });
  }

  function load(config) {
    $('.hostnames').innerHTML = '';
    config.sites.forEach(function(site) {
      $('.hostnames').appendChild(createHostnameOption(site));
    });
    $('input[name="default-port"]').value = config.port;
  }

  /**
   * Templates.
   */

  function createHostnameOption(item) {
    var option = document.createElement('li');
    var text = document.createElement('span');
    var remove = document.createElement('a');
    remove.textContent = 'x';
    remove.classList.add('remove');
    text.textContent = item.pattern;
    text.dataset.pattern = item.pattern;
    text.dataset.port = item.port;
    text.dataset.server = item.server;
    option.appendChild(text);
    option.appendChild(remove);
    option.classList.add('item');
    return option;
  }

  function createLogItem(level, str) {
    var div = document.createElement('div');
    div.classList.add('loglevel-' + level);
    div.textContent = str;
    return div;
  }

  function showHostnameForm(callback) {
    var form = $('.hostname-form');
    form.classList.remove('hidden');
    form.querySelector('button').onclick = function() {
      var pattern = form.querySelector('[name=pattern]').value.trim();
      if (!pattern) {
        form.querySelector('[name=pattern]').classList.add('red');
        return;
      }

      var item = {
        pattern: pattern,
        server: form.querySelector('[name=server]').value.trim(),
        port: form.querySelector('[name=port]').value.trim()
      };

      this.onclick = null;
      form.classList.add('hidden');
      $$('.hostname-form input').forEach(function(input) {
        input.classList.remove('red');
        input.value = '';
      });

      callback(item);
    }
  }

  /**
   * Event handlers.
   */

  $('form').onsubmit = function (e) {
    e.preventDefault();
  };

  $('button.add').onclick = function () {
    showHostnameForm(function(item) {
      var option = createHostnameOption(item);
      $('.hostnames').appendChild(option);
      save();
    });
  };

  $('.hostnames').onclick = function (e) {
    if (e.target.classList.contains('remove')) {
      e.target.parentNode.parentNode.removeChild(e.target.parentNode);
      save();
    }
  };

  $('form').onchange = save;

  var prevStatus = 'disabled';
  listenToEvent('status_change', function(e) {
    var data = e.data;
    var indicator = $('.status .indicator')
    indicator.classList.remove(prevStatus);
    indicator.classList.add(data.type);
    prevStatus = data.type;
    $('.status .text').textContent = data.text;
    $$('.status .action').forEach(function(el) {
      el.classList.add('hidden');
    });
    if (data.action) {
      $('.status .' + data.action).classList.remove('hidden');
    }
  });

  $('.action.retry').onclick = function() {
    triggerEvent('retry');
  };

  $('.action.enable').onclick = function() {
    triggerEvent('enable_for_host');
  };

  listenToEvent('load', function(e) {
    load(e.data);
  });

  var logs = '';

  listenToEvent('log', function(e) {
    var level = e.data[0];
    var args = e.data[1];
    var message = args.map(function(a) {
      return a.toString()
    }).join(' ');

    var item = createLogItem(
      level,
      message
    );
    var box = $('.log-box');
    box.appendChild(item);
    box.scrollTop = box.scrollHeight;

    logs += '\n' + '[' + level + ']' + message;
    var report = $('.report-bug');
    report.search = 'title=' + 'Report from extension'
      + '&body=```' + logs + '\n```';
  });
})();
