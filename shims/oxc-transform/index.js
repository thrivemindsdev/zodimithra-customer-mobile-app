'use strict';
// CJS stub for oxc-transform used by @hot-updater/cli-tools during expo prebuild.
// transformSync is only needed to inline HotUpdater.* env defines in the config file,
// which is not required at prebuild time, so returning code unchanged is safe.
module.exports = {
  transform: (_filename, code, _options) => ({ code }),
  transformSync: (_filename, code, _options) => ({ code }),
};
