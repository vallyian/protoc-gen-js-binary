const fs = require("node:fs");
const child_process = require("node:child_process");

test().catch(err => {
    console.error(`\x1b[31m${typeof err === "string" ? err : JSON.stringify(err)}\x1b[0m`);
    process.exit(1);
}).finally(clean);

async function test() {
    clean();
    await execP(cmd("npm"), ["pack"]);
    fs.mkdirSync("test", { recursive: true });
    fs.renameSync(tgz()[0], "test/protoc-gen-js-binary.tgz");
    await execP(cmd("npm"), ["init", "-y"], "test");
    await execP(cmd("npm"), ["i", "-D", "./protoc-gen-js-binary.tgz"], "test");
    await execP(cmd("npm"), ["i", "-D", "protoc-binary"], "test");
    console.log(require("./test/package.json").devDependencies);
    fs.writeFileSync("test/test.proto", `
        message EchoRequest { required string message = 1; }
        message EchoResponse { required string message = 1; }
        service EchoService { rpc Echo(EchoRequest) returns (EchoResponse); }
    `, "utf8");
    await execP(cmd("test/node_modules/.bin/protoc"), [
        "--plugin=protoc-gen-js=test/node_modules/protoc-gen-js-binary/protoc-gen-js",
        "--js_out=import_style=commonjs:test",
        "-I=test",
        "test/test.proto",
    ]);
    if (!fs.existsSync("test/test_pb.js"))
        throw Error("js not generated");
}

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
