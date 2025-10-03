import fs from "node:fs"

const packages = ["core", "navigation", "store", "router"]

const newVersion = process.argv[2]

if (!newVersion) {
  console.error("version argument is missing")
  process.exit(1)
}

packages.forEach((_package) => {
  const pkgDir = `./packages/${_package}`;
  const pkgJson = `${pkgDir}/package.json`;

  const raw = fs.readFileSync(pkgJson);
  const content = JSON.parse(raw.toString());
  content.version = newVersion.trim();
  fs.writeFileSync(pkgJson, JSON.stringify(content, null, 2));

  execSync(`npm publish --access public`, {
    cwd: pkgDir,
    stdio: "inherit",
  });
});
