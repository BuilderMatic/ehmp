var dependencies = [
];

define(dependencies, onResolveDependencies);

function onResolveDependencies() {
    'use strict';

var Config = {
    // Switch ON/OFF debug info
        debug: false,
        defaultTimeFormat: true
    };
  return Config;
}