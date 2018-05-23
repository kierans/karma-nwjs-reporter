# karma-nwjs-reporter

Reporter factory to decorate Karma reporters used with NW.js

Karma is designed to work with web apps ie: code served from a webserver. However NW apps often `require` their source from the filesystem. This can prevent Karma (and plugins) from being able to process the output correctly eg: identify source lines.

This reporter wraps other reporters to preprocess the output so that NW specific concerns can be abstracted away without having to change Karma or a plugin. This reporter doesn't actually report anything; it must have a delegate reporter to work with.

## Features
 - Convert absolute filepaths to "Karma paths". This allows files that are required in a NW.js app to be processed by Karma, for example to map generated source lines to the original source code (using source maps).

# Usage

```bash
$ npm install karma-nwjs-reporter --save-dev
```

In your Karma config

```javascript
config.set({
  basePath: basePath,
  reporters: [ "nwjs" ],
  
  nwjsReporter: {
    // put the reporter that you want decorated here
    reporters: [ "mocha" ]
  }
});
```
## Limitations

Currently only one reporter can be decorated. This is because this plugin is implemented as a factory to return the real reporter with a decorated `formatError` function. However only a single reporter can be returned from the factory.
