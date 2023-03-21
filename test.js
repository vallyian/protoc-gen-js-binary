const fs = require("node:fs");
const path = require("node:path");
const child_process = require("node:child_process");
const { describe, it, before, after } = require("node:test");
const assert = require("node:assert");

describe("protoc-gen-js", () => {
    before(async () => {
        clean();
        await execP(cmd("npm"), ["pack"]);
        fs.mkdirSync("test", { recursive: true });
        const packs = tgz();
        assert.equal(packs.length, 1);
        fs.renameSync(packs[0], "test/protoc-gen-js-binary.tgz");
        await execP(cmd("npm"), ["init", "-y"], "test");
    });

    after(clean);

    it("install", async () => {
        await execP(cmd("npm"), ["i", "-D", "./protoc-gen-js-binary.tgz"], "test");

        assert.equal(fs.existsSync("./test/node_modules/protoc-gen-js-binary/package.json"), true);
        const { main, files } = require("./test/node_modules/protoc-gen-js-binary/package.json");
        assert.equal(main, "index.js");
        assert.equal(files.sort().join(","), ["env.js", "index.d.ts", "install.js"].sort().join(","));
        files.concat(["index.js"]).forEach(f => assert.equal(fs.existsSync(`./test/node_modules/protoc-gen-js-binary/${f}`), true));
        assert.equal(fs.existsSync("./test/node_modules/protoc-gen-js-binary/protoc-gen-js"), true);
    });

    it("binary API", () => {
        const binary = require("./test/node_modules/protoc-gen-js-binary/index.js").binary;

        assert.equal(path.resolve(binary), path.join(__dirname, "test", "node_modules", "protoc-gen-js-binary", "protoc-gen-js"));
    });

    it("version API", () => {
        const version = require("./test/node_modules/protoc-gen-js-binary/index.js").version;

        assert.ok(version);
    });

    describe("protoc", () => {
        before(async () => {
            await execP(cmd("npm"), ["i", "-D", "protoc-binary", "google-protobuf"], "test");
            fs.writeFileSync("test/test.proto", `
                message EchoRequest { required string message = 1; }
                message EchoResponse { required string message = 1; }
                service EchoService { rpc Echo(EchoRequest) returns (EchoResponse); }
            `, "utf8");

            assert.equal(fs.existsSync(cmd("test/node_modules/.bin/protoc")), true);
        });

        it("generate js", async () => {
            await execP(cmd("node_modules/.bin/protoc"), [
                "--plugin=protoc-gen-js=node_modules/protoc-gen-js-binary/protoc-gen-js",
                "--js_out=import_style=commonjs:.",
                "-I=.",
                "test.proto",
            ], "test");

            assert.equal(fs.existsSync("test/test_pb.js"), true);
        });

        it("import js", () => {
            const js = require("./test/test_pb.js");

            assert.ok(js);
            assert.ok(js.EchoRequest);
            assert.ok(js.EchoResponse);
        });
    });
});

// helpers

function clean() {
    fs.rmSync("test", { recursive: true, force: true });
    tgz().forEach(f => fs.rmSync(f, { force: true }));
}

function tgz() { return fs.readdirSync(".").filter(f => f.endsWith(".tgz")); }

function cmd(exe) { return process.platform === "win32" ? `${exe.replace(/\//gmi, "\\")}.cmd` : exe; }

function execP(cmd, args, cwd = process.cwd()) {
    return new Promise((ok, reject) => {
        const child = child_process.spawn(
            cmd,
            args.filter(c => c && !!(String(c).trim())),
            { shell: false, cwd }
        );
        child.stdout.pipe(process.stdout);
        child.stderr.pipe(process.stderr);
        child.on("exit", code => code ? reject(code) : ok())
    });
}
