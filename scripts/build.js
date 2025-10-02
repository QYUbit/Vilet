import esbuild from "esbuild"
import fs from "node:fs"

const packages = ["core", "navigation", "store", "router"]

packages.forEach((_package) => {
    if (!fs.existsSync(`./packages/${_package}/dist`)) {
        fs.mkdirSync(`./packages/${_package}/dist`)
    }

    esbuild.build({
        entryPoints: [`./packages/${_package}/src/index.ts`],
        outfile: `packages/${_package}/dist/module.esm.js`,
        bundle: true,
        platform: "neutral",
    }).catch(handleBuildError)

    esbuild.build({
        entryPoints: [`./packages/${_package}/src/index.ts`],
        outfile: `packages/${_package}/dist/module.cjs.js`,
        bundle: true,
        platform: "node",
    }).catch(handleBuildError)

    esbuild.build({
        entryPoints: [`./packages/${_package}/src/browser.ts`],
        outfile: `packages/${_package}/dist/cdn.min.js`,
        bundle: true,
        minify: true,
        platform: "browser",
    })
    .then(() => outputSize(_package, `./packages/${_package}/dist/cdn.min.js`))
    .catch(handleBuildError)
})

function handleBuildError(err) {
    console.log(err)
    process.exit(1)
}

function outputSize(_package, file) {
    const size = bytesToSize(fs.readFileSync(file).length)
    console.log(`${_package}: ${size}`)
}

function bytesToSize(bytes) {
    if (bytes === 0) return "0 KB";
    const kb = bytes / 1024;
    return `${kb.toFixed(1)} KB`;
}
