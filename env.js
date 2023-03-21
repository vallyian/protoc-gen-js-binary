const path = require("node:path");

const binaryZip = {
    "darwin-arm64": "osx-aarch_64.zip",
    "darwin-x64": "osx-x86_64.zip",
    "linux-x32": "linux-x86_32.zip",
    "linux-x64": "linux-x86_64.zip",
    "linux-arm64": "linux-aarch_64.zip",
    "win32-x32": "win32.zip",
    "win32-x64": "win64.zip"
}[process.platform + "-" + process.arch];

module.exports = Object.freeze({
    binary: path.join(__dirname, "protoc-gen-js"),
    binaryZip,
    downloadUrlTemplate: `https://github.com/protocolbuffers/protobuf-javascript/releases/download/v{version}/protobuf-javascript-{version}-${binaryZip}`,
    latestReleaseUrl: "https://api.github.com/repos/protocolbuffers/protobuf-javascript/releases/latest",
    safeUnzip: Object.freeze({
        MAX_FILES: 1_000,
        MAX_SIZE: 10_000_000, // 10 MB
        MAX_RATIO: 20
    })
});
