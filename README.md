flo
---

a nicer workflow

## Usage

### flo(dirToWatch, [options, callback(filepath, callback)])

flo exports a single function that takes the following arguments:

* dirToWatch: a string of the absolute or relative path of the directory to watch
* options: an optional options hash:
  * port, defaults to 8888
  * host, defaults to localhost
* callback(filepath, callback): an optional resolver callback for when a file in the directory changes, it should expect the following args:
  * filepath: string representing the filepath relative to the watched directory
  * callback: a function to be called when with the resource update information, namely:
    * resourceURL: the resource URL that will be used to identify the resource in the browser
    * contents: the contents of the resource.

If you don't have a static resource build-step your flo call could like like this:

```js
var flo = require('flo')
flo(
  '/path/to/www/root',
  { port: 8888, host: 'localhost' },
  function (filepath, callback) {
    callback({
      resourceURL: filepath,
      contents: fs.readFileSync(filepath).toString()
    });
  }
);
```

In reality, flo defaults the options and resolver callback to exactly that, so you can just do:

```js
flo('/path/to/www/root');
```

