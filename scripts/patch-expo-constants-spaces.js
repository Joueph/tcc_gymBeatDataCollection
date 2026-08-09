const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const podspecPath = path.join(root, "node_modules", "expo-constants", "ios", "EXConstants.podspec");
const scriptPath = path.join(root, "node_modules", "expo-constants", "scripts", "get-app-config-ios.sh");
const expoSQLiteIosPath = path.join(root, "node_modules", "expo-sqlite", "ios");
const expoSQLiteVendorPath = path.join(root, "node_modules", "expo-sqlite", "vendor", "sqlite3");

const patchFile = (filePath, replacements) => {
  if (!fs.existsSync(filePath)) {
    return;
  }

  let contents = fs.readFileSync(filePath, "utf8");
  let nextContents = contents;

  for (const [from, to] of replacements) {
    nextContents = nextContents.replace(from, to);
  }

  if (nextContents !== contents) {
    fs.writeFileSync(filePath, nextContents);
  }
};

patchFile(podspecPath, [
  [
    ':script => "bash -l -c \\"#{env_vars}$PODS_TARGET_SRCROOT/../scripts/get-app-config-ios.sh\\"",',
    ':script => "bash -l -c \\"#{env_vars}\\\\\\"$PODS_TARGET_SRCROOT/../scripts/get-app-config-ios.sh\\\\\\"\\"",',
  ],
]);

patchFile(scriptPath, [["PROJECT_DIR_BASENAME=$(basename $PROJECT_DIR)", 'PROJECT_DIR_BASENAME=$(basename "$PROJECT_DIR")']]);

for (const fileName of ["sqlite3.c", "sqlite3.h"]) {
  const sourcePath = path.join(expoSQLiteVendorPath, fileName);
  const destinationPath = path.join(expoSQLiteIosPath, fileName);

  if (fs.existsSync(sourcePath) && !fs.existsSync(destinationPath)) {
    fs.copyFileSync(sourcePath, destinationPath);
  }
}
