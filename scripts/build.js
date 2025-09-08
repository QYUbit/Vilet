import esbuild from "esbuild"
import fs from "node:fs"

const packages = ["core", "model"]

packages.forEach((_package) => {
    if (!fs.existsSync(`./packages/${_package}/dist`)) {
        fs.mkdirSync(`./packages/${_package}/dist`)
    }

    esbuild.build({
        entryPoints: [`./packages/${_package}/src/index.js`],
        outfile: `packages/${_package}/dist/module.esm.js`,
        bundle: true,
        platform: "neutral",
    }).catch(handleBuildError)

    esbuild.build({
        entryPoints: [`./packages/${_package}/src/index.js`],
        outfile: `packages/${_package}/dist/module.cjs.js`,
        bundle: true,
        platform: "node",
    }).catch(handleBuildError)

    esbuild.build({
        entryPoints: [`./packages/${_package}/src/browser.js`],
        outfile: `packages/${_package}/dist/cdn.min.js`,
        bundle: true,
        minify: true,
        platform: "browser",
    }).catch(handleBuildError)
})

function handleBuildError(err) {
    console.log(err)
    process.exit(1)
}
