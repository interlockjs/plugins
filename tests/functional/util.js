import path from "path";
import fs from "fs";


export function copyDirRecursiveSync (sourceDir, targetDir) {
  if (!fs.existsSync(targetDir)) { fs.mkdirSync(targetDir); }

  const files = fs.readdirSync(sourceDir);
  files.forEach(filename => {
    const sourcePath = path.join(sourceDir, filename);
    const targetPath = path.join(targetDir, filename);

    if (fs.lstatSync(sourcePath).isDirectory()) {
      copyDirRecursiveSync(sourcePath, targetPath);
    } else {
      fs.writeFileSync(targetPath, fs.readFileSync(sourcePath));
    }
  });
}
