console.log('Booting');

chrome.devtools.inspectedWindow.eval(
  'location.href',
  function (result) {
    if (result.match(/sb\.facebook\.com/i)) {
      init();
    }
  }
);

var inspectedWindow = chrome.devtools.inspectedWindow;

function init() {
  console.log('Starting');
  var resources;
  inspectedWindow.getResources(function (res) {
    resources = res;
  });

  inspectedWindow.onResourceAdded.addListener(function (res) {
    resources.push(res);
  });

  var ws = new WebSocket('ws://www.amasad.sb.facebook.com:8888/');

  ws.onerror = function (err) {
    console.error('Error connecting');
  };

  ws.onopen = function() {
    console.log('connected');
  };

  console.log('connecting', ws);
  ws.onmessage = function (evt) {
    console.log(evt.data);
    var msg = JSON.parse(evt.data);

    var updatedResource = {
      package: msg.package,
      code: msg.code
    };
    console.log('Resource update', updatedResource);

    var resource = resources.filter(function (res) {
      return res.url.indexOf(updatedResource.package) > -1;
    })[0];

    if (!resource) {
      throw new Error('Resource not found: ' + updatedResource.package);
    }

    resource.setContent(updatedResource.code, true, function (err) {
      console.error(err);
    });
  };

}
