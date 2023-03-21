#!/usr/bin/env node
const fs = require("node:fs");
const evn = require("./env");

module.exports = Object.freeze({
    /** Absolute path to local protoc-gen-js binary */
    binary: evn.binary,

    /** Version of local protoc-gen-js binary, or empty string */
    get version() { return getBinaryVersion(); },
});

function getBinaryVersion() {
    if (!fs.existsSync(evn.binary)) return "";
    let ret;
    try {
        ret = require("./package.json")["protoc-gen-js-version"];
    } catch (ex) {
        ret = "";
    }
    return /[0-9.]/.test(ret) ? ret : "";
}
