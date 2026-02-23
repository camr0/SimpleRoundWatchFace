const Clay = require("@rebble/clay");
const clayConfig = require("./config");
new Clay(clayConfig);

const moddableProxy = require("@moddable/pebbleproxy");
Pebble.addEventListener("ready",      moddableProxy.readyReceived);
Pebble.addEventListener("appmessage", moddableProxy.appMessageReceived);
