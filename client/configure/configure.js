(function () {

  /**
   * Utils.
   */

  var $ = document.querySelector.bind(document);

  function $$() {
    var els = document.querySelectorAll.apply(document, arguments);
    return [].slice.call(els);
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
    localStorage.setItem('flo-config', JSON.stringify({
      port: port,
      hostnames: hostnames
    }));
    var event = new Event('config_changed');
    window.dispatchEvent(event);
  }

  function load() {
    var config;
    try {
      config = JSON.parse(localStorage.getItem('flo-config'));
    } catch (e) {
      return;
    }
    var hostnames = config.hostnames || [];
    var port = config.port || 8888;
    hostnames.forEach(function(host) {
      $('.hostnames').appendChild(createHostnameOption(host));
    });
    $('input[name="port"').value = port;
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
  load();
})();
