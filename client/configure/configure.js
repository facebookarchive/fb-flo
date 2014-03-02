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
    var hostnames = $$('.hostnames .item span').map(function(el) {
      return el.textContent.trim();
    });
    var port = $('input[name="port"').value.trim();
    triggerEvent('config_changed',{
      port: port,
      hostnames: hostnames
    });
  }

  function load(config) {
    $('.hostnames').innerHTML = '';
    config.hostnames.forEach(function(host) {
      $('.hostnames').appendChild(createHostnameOption(host));
    });
    $('input[name="port"').value = config.port;
  }

  /**
   * Templates.
   */

  function createHostnameOption(val) {
    var option = document.createElement('li');
    var text = document.createElement('span');
    var remove = document.createElement('a');
    remove.textContent = 'x';
    remove.classList.add('remove');
    text.textContent = val;
    option.appendChild(text);
    option.appendChild(remove);
    option.classList.add('item');
    return option;
  }

  function createLogItem(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div;
  }

  /**
   * Event handlers.
   */

  $('form').onsubmit = function (e) {
    e.preventDefault();
  };

  $('button.add').onclick = function () {
    var hostname = prompt(
      'Enter hostname pattern:'
    );
    if (!hostname) {
      return;
    }
    var option = createHostnameOption(hostname);
    $('.hostnames').appendChild(option);
    save();
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

  listenToEvent('log', function(e) {
    var item = createLogItem(
      e.data.map(function(a) {
        return a.toString()
      }).join(' ')
    );
    $('.log-box').appendChild(item);
  });
})();
