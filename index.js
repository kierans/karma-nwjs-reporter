"use strict";

const _ = require("lodash");

/**
 * A reporter that processes Karma output generated in an NW application.
 *
 * Karma is designed to work with web apps ie: code served from a webserver. However NW apps
 * often `require` their source from the filesystem. This can prevent Karma (and plugins) from
 * being able to process the output correctly eg: identify source lines.
 *
 * This reporter wraps other reporters to preprocess the output so that NW specific concerns can
 * be abstracted away without having to change Karma or a plugin. This reporter doesn't actually
 * report anything; it must have a delegate reporter to work with.
 *
 * @param {!Function} baseReporterDecorator The Karma base reporter.
 * @param {!Function} formatError The Karma function to format an error.
 * @param {!object} injector The Karma DI injector
 * @param {!object} emitter The Karma event emitter
 * @param {!object} logger The Karma logger factory.
 * @param {!object} config The Karma config.
 * @constructor
 */
const NWReporter = function(baseReporterDecorator, formatError, injector, emitter, logger, config) {
  /*
   * A lot of this code was borrowed from Karma's own reporter class as we have to instantiate
   * child reporters ourselves.
   */
  const log = logger.create("reporter.nwjs");

  function instantiateReporter(injector, locals, name) {
    try {
      log.debug("Trying to load reporter: %s", name);

      const child = injector.createChild([locals], ["reporter:" + name]);

      return child.get("reporter:" + name);
    }
    catch (e) {
      if (e.message.indexOf("No provider for 'reporter:'" + name + "''") !== -1) {
        log.error("Can not load reporter '%s', it is not registered!\n  Perhaps you are missing some plugin?", name);
      }
      else {
        log.error("Can not load '%s'!\n  " + e.stack, name);
      }

      emitter.emit("load_error", "reporter", name);
    }

    return null;
  }

  /**
   * We want to decorate the "formatError" function to add some NW specific functionality.
   * @param {!object} config Karma config object.
   * @param {!Function} formatError The function to decorate.
   * @return {Function} A "formatError" function.
   */
  function createErrorFormatter(config, formatError) {
    log.debug("Using config.basePath: '" + config.basePath + "'");

    return function(input, indentation) {
      indentation = _.isString(indentation) ? indentation : "";

      if (_.isError(input)) {
        input = input.message;
      }

      if (_.isEmpty(input)) {
        input = "";
      }

      if (!_.isString(input)) {
        input = JSON.stringify(input, null, indentation);
      }

      /*
       * When Karma is looking for line information, it's looking for strings of the form
       *
       * base/relative-path?karma-generated-query-hash:123:456
       *
       * or
       *
       * absolute/absolute-path?karma-generated-query-hash:123:456
       *
       * because that's what comes back from the browser.
       *
       * However NW.js apps "require" their source from the disk, so we have to fix the
       * filesystem path into something Karma will "see".
       */
      input = input.replace(config.basePath, "base");

      /*
       * We can now delegate to the wrapped formatError.
       */
      return formatError(input, indentation);
    };
  }

  if (!config.nwjsReporter || !config.nwjsReporter.reporters) {
    throw new Error("No reporters configured for NWJS");
  }

  if (config.nwjsReporter.reporters.length === 0) {
    throw new Error("No reporters to decorate.");
  }

  if (config.nwjsReporter.reporters.length > 1) {
    throw new Error("More than one reporter decorated.");
  }

  const locals = {
    formatError: ["value", createErrorFormatter(config, formatError)]
  };

  const reporters = config.nwjsReporter.reporters
      .map(instantiateReporter.bind(this, injector, locals))
      .filter((reporter) => reporter !== null);

  reporters.forEach((reporter) => emitter.bind(reporter));

  return reporters[0];
};

// inject Karma runner baseReporter and config
NWReporter.$inject = ["baseReporterDecorator", "formatError", "injector", "emitter", "logger", "config"];

module.exports = {
  "reporter:nwjs": ["factory", NWReporter]
};
