#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const os = require("os");
const { execSync } = require("child_process");

const tag = process.argv[2] || process.env.TAG;
if (!tag) {
  console.error("Usage: node generate-latest-json.cjs <TAG>");
  process.exit(1);
}

const ver = tag.replace(/^v/, "");
console.log(`Generating latest.json manifest for DomoLens ${tag} (version ${ver})...`);

try {
  // 1. Query release assets
  const output = execSync(`gh release view "${tag}" --json assets`, { encoding: "utf8" });
  const { assets } = JSON.parse(output);

  console.log(`Found ${assets.length} assets on release ${tag}.`);

  const platforms = {};

  // Helper to retrieve signature file content
  function getSignatureContent(sigAssetName) {
    try {
      const tmpPath = path.join(os.tmpdir(), sigAssetName);
      execSync(`gh release download "${tag}" --pattern "${sigAssetName}" --output "${tmpPath}" --clobber`, {
        stdio: "pipe",
      });
      if (fs.existsSync(tmpPath)) {
        const content = fs.readFileSync(tmpPath, "utf8").trim();
        try {
          fs.unlinkSync(tmpPath);
        } catch {}
        return content;
      }
    } catch (err) {
      console.warn(`Could not download signature for ${sigAssetName}:`, err.message);
    }
    return null;
  }

  // 2. Match macOS updater bundle (.app.tar.gz preferred)
  const macTar =
    assets.find((a) => a.name.endsWith(".app.tar.gz")) ||
    assets.find((a) => a.name.endsWith(".dmg"));
  const macSig =
    assets.find((a) => a.name.endsWith(".app.tar.gz.sig")) ||
    assets.find((a) => a.name.endsWith(".dmg.sig"));

  if (macTar && macSig) {
    const sig = getSignatureContent(macSig.name);
    if (sig) {
      const downloadUrl = `https://github.com/darknecrocities/DomoLens/releases/download/${tag}/${macTar.name}`;
      platforms["darwin-aarch64"] = { signature: sig, url: downloadUrl };
      platforms["darwin-x86_64"] = { signature: sig, url: downloadUrl };
      console.log(`Configured macOS updater: ${macTar.name}`);
    }
  }

  // 3. Match Windows updater bundle (.nsis.zip preferred)
  const winZip =
    assets.find((a) => a.name.endsWith(".nsis.zip")) ||
    assets.find((a) => a.name.endsWith("-setup.exe")) ||
    assets.find((a) => a.name.endsWith("Windows-Setup.exe"));
  const winSig =
    assets.find((a) => a.name.endsWith(".nsis.zip.sig")) ||
    assets.find((a) => a.name.endsWith("-setup.exe.sig")) ||
    assets.find((a) => a.name.endsWith("Windows-Setup.exe.sig"));

  if (winZip && winSig) {
    const sig = getSignatureContent(winSig.name);
    if (sig) {
      const downloadUrl = `https://github.com/darknecrocities/DomoLens/releases/download/${tag}/${winZip.name}`;
      platforms["windows-x86_64"] = { signature: sig, url: downloadUrl };
      console.log(`Configured Windows updater: ${winZip.name}`);
    }
  }

  // 4. Match Linux updater bundle (.AppImage.tar.gz preferred)
  const linuxTar =
    assets.find((a) => a.name.endsWith(".AppImage.tar.gz")) ||
    assets.find((a) => a.name.endsWith(".AppImage"));
  const linuxSig =
    assets.find((a) => a.name.endsWith(".AppImage.tar.gz.sig")) ||
    assets.find((a) => a.name.endsWith(".AppImage.sig"));

  if (linuxTar && linuxSig) {
    const sig = getSignatureContent(linuxSig.name);
    if (sig) {
      const downloadUrl = `https://github.com/darknecrocities/DomoLens/releases/download/${tag}/${linuxTar.name}`;
      platforms["linux-x86_64"] = { signature: sig, url: downloadUrl };
      console.log(`Configured Linux updater: ${linuxTar.name}`);
    }
  }

  const manifest = {
    version: ver,
    notes: `DomoLens Automated Release ${tag}\n• macOS (.dmg, .app)\n• Windows (.exe installer)\n• Linux (.AppImage, .deb)`,
    pub_date: new Date().toISOString(),
    platforms: platforms,
  };

  fs.writeFileSync("latest.json", JSON.stringify(manifest, null, 2) + "\n");
  console.log("Generated latest.json successfully:\n", JSON.stringify(manifest, null, 2));

  execSync(`gh release upload "${tag}" latest.json --clobber`, { stdio: "inherit" });
  console.log(`Successfully published latest.json to release ${tag}`);
} catch (err) {
  console.error("Failed to generate or upload latest.json:", err);
  process.exit(1);
}
