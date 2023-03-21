const fs = require("node:fs");
const path = require("node:path");
const https = require("node:https");
const extract = require("extract-zip");
const env = require("./env");
const index = require("./index");

const binaryZipRx = new RegExp(`\/protobuf-javascript-(.*)-${env.binaryZip}`);

install();

function install() {
    let version = "";
    let downloadUrl = "";
    const tmpDir = path.join(__dirname, "tmp");
    const tmpZipFile = path.join(tmpDir, "protoc-gen-js.zip");
    const tmpBinFile = path.join(tmpDir, "bin", `protoc-gen-js${process.platform === "win32" ? ".exe" : ""}`);

    const validatePlatform = () => env.binaryZip
        || Promise.reject(`${process.platform}-${process.arch} unsupported`);
    const checkBinaryVersion = () => getVersionInfo().then(bin => {
        version = bin.version;
        downloadUrl = bin.downloadUrl;
        if (bin.version === index.version) return Promise.reject("ERR_BIN_EEXIST");
    });
    const removeBinary = () => fs.promises.rm(env.binary, { recursive: true, force: true });
    const removeTmpDir = () => fs.promises.rm(tmpDir, { recursive: true, force: true });
    const cleanDir = () => Promise.all([removeBinary(), removeTmpDir()]);
    const createTmpDir = () => fs.promises.mkdir(tmpDir, { recursive: true });
    const downloadZip = () => download(downloadUrl, tmpZipFile).then(() => fs.existsSync(tmpZipFile)
        || Promise.reject(`binary "${env.binaryZip} not downloaded"`));
    const deflateZip = () => unzip(tmpZipFile, tmpDir).then(() => fs.existsSync(tmpBinFile)
        || Promise.reject(`binary "${tmpBinFile} not unzipped"`));
    const moveBinary = () => fs.promises.rename(tmpBinFile, env.binary).then(() => fs.existsSync(env.binary)
        || Promise.reject(`binary "${env.binary} not available"`));
    const makeBinaryExecutable = () => fs.promises.access(env.binary, fs.constants.X_OK).catch(({ code }) => code === "EACCES"
        ? fs.promises.chmod(env.binary, 0o770)
        : Promise.reject(`binary "${env.binary} not executable"`));
    const storeBinaryVersion = () => fs.promises.writeFile(
        "package.json",
        JSON.stringify({ ...require("./package.json"), "protoc-gen-js-version": version }, null, 4),
        "utf8");

    return Promise.resolve()
        .then(validatePlatform)
        .then(checkBinaryVersion)
        .then(cleanDir)
        .then(createTmpDir)
        .then(() => console.log(`downloading protoc-gen-js v${version} from ${downloadUrl}`))
        .then(downloadZip)
        .then(deflateZip)
        .then(moveBinary)
        .then(makeBinaryExecutable)
        .then(storeBinaryVersion)
        .then(() => console.log(`downloaded protoc-gen-js v${version}`))
        .catch(err => err === "ERR_BIN_EEXIST"
            ? console.log(`latest protoc-gen-js v${version} already exists, skipping download`)
            : Promise.reject(err))
        .finally(removeTmpDir);
}

async function unzip(zip, dir) {
    let fileCount = 0;
    let totalSize = 0;

    await extract(zip, {
        dir,
        onEntry: entry => {
            fileCount++;
            if (fileCount > env.safeUnzip.MAX_FILES)
                throw Error('Reached max. number of files');

            let entrySize = entry.uncompressedSize;
            totalSize += entrySize;
            if (totalSize > env.safeUnzip.MAX_SIZE)
                throw Error('Reached max. size');

            if (entry.compressedSize > 0) {
                let compressionRatio = entrySize / entry.compressedSize;
                if (compressionRatio > env.safeUnzip.MAX_RATIO)
                    throw Error('Reached max. compression ratio');
            }
        }
    });
}

async function getVersionInfo() {
    let version = getRequestedVersion();
    let downloadUrl = "";

    if (version) {
        downloadUrl = env.downloadUrlTemplate.replace(/\{version\}/g, version);
    } else {
        process.stdout.write(`querying latest protoc-gen-js version...`);
        downloadUrl = await getLatestReleaseLink().catch(e => {
            process.stdout.write('\n');
            throw e;
        });
        version = downloadUrl.match(binaryZipRx)[1];
        process.stdout.write(`v${version} found\n`);
    }

    return { version, downloadUrl };
}

function getRequestedVersion() {
    let dir = process.cwd();
    let requestedVersion = undefined;
    while (!requestedVersion) {
        const packageJsonPath = path.join(dir, "package.json");
        if (fs.existsSync(packageJsonPath))
            requestedVersion = require(packageJsonPath)["protoc-gen-js-binary"];
        if (requestedVersion || !dir.includes("node_modules"))
            break;
        dir = path.normalize(path.join(dir, ".."));
    }
    return requestedVersion || "";
}

function getLatestReleaseLink() {
    return new Promise((resolve, reject) => https.get(env.latestReleaseUrl, { headers: { "User-Agent": `Nodejs/${process.version}` } }, response => {
        let data = "";
        response.on("data", chunk => data += chunk);
        response.on("end", () => {
            const link = JSON.parse(data).assets.find(a => binaryZipRx.test(a.browser_download_url));
            link
                ? resolve(link.browser_download_url)
                : reject(`binary ${env.binaryZip} not available`);
        });
    }).on("error", reject));
}

function download(uri, filename) {
    return new Promise((resolve, reject) => https.get(uri, response => {
        if (response.statusCode === 200)
            response.pipe(
                fs.createWriteStream(filename)
                    .on("error", reject)
                    .on("close", resolve)
            );

        else if (response.headers.location)
            resolve(download(response.headers.location, filename));

        else
            reject(Error(`${response.statusCode} ${response.statusMessage}`));

    }).on("error", reject));
}
