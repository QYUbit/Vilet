import esbuild from "esbuild"

const scripts = [
    "./examples/store_example/example.ts",
    "./examples/navigation_sample/navigation.ts"
]

scripts.forEach((script) => {
    const parts = script.split("/")
    parts[parts.length - 1] = "script.js"

    esbuild.build({
        entryPoints: [script],
        outfile: parts.join("/"),
        bundle: true,
        //allowOverwrite: true,
        platform: "browser",
    }).catch(err => console.error(err))
})
