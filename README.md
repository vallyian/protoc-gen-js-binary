# protoc-gen-js-binary

Downloads Google Protocol Buffers Javascript generator binary wrapped as npm package.  
By default, it will download the latest released version.  
If a specific version is required, add `"protoc-gen-js-binary": "x.x.x"` at the root of your package.json.

## Install

`npm i -D protoc-gen-js-binary`

To force re-check for latest protoc-gen-js binary releases, simply run `npm ci`.  
Alternatively, you can manually invoke the install script `node node_modules/protoc-gen-js-binary/install`.  
If working in both Windows and WSL, you can invoke the install script to download binaries for both,
however when switching OS you should run `npm ci`.  

## Usage

Add `--plugin=protoc-gen-js=node_modules/protoc-gen-js-binary/protoc-gen-js` arg to `protoc` command

```sh
# download protoc and protoc-gen-js binaries
npm install   protoc-gen-js-binary   protoc-binary

# replace `input_dir`, `output_dir` and `my.proto` with actual values
node_modules/.bin/protoc \
    --plugin=protoc-gen-js=node_modules/protoc-gen-js-binary/protoc-gen-js \
    --js_out=import_style=commonjs:input_dir \
    -I=output_dir \
    my.proto
```

Alternatively, add the full path of `protoc-gen-js-binary` to PATH  
e.g. `/home/user/node_modules/protoc-gen-js-binary`

## API

### `binary`

```js
/* Returns the absolute path to local protoc-gen-js binary */
require("protoc-gen-js-binary").binary;
```

### `version`

```js
/* Returns version of local protoc-gen-js binary */
require("protoc-gen-js-binary").version;
```

## Supported versions

See official [protocolbuffers/protobuf-javascript](https://github.com/protocolbuffers/protobuf-javascript/releases) download page.

* osx-x86_64.zip
* osx-aarch_64.zip
* linux-x86_32.zip
* linux-x86_64.zip
* linux-aarch_64.zip
* win32.zip
* win64.zip
