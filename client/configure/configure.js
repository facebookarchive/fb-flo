(function () {
  var $ = document.querySelector.bind(document);

  function $$() {
    var els = document.querySelectorAll.apply(document, arguments);
    return [].slice.call(els);
  }

  function save() {
    var hostnames = $$('.hostnames option').map(function (el){
      return el.value.trim();
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

  function createHostnameOption(val) {
    var option = document.createElement('option');
    option.value = val;
    option.text = val;
    return option;
  }

  $('form').onsubmit = function (e) {
    e.preventDefault();
  };

  $('button.add').onclick = function () {
    var hostname = prompt(
      'Enter hostname pattern. Surround with / for regex' +
      '\ne.g. /example\\.com/gi'
    );
    if (!hostname) {
      return;
    }
    var option = createHostnameOption(hostname);
    $('.hostnames').appendChild(option);
    save();
  };

  $('button.remove').onclick = function () {
    $$('.hostnames :checked').forEach(function(el) {
      $('.hostnames').removeChild(el);
    });
    save();
  };

  $('form').onchange = save;
  load();
})();
