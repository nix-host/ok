const axios = require('axios');
const path = require('path');
const fs = require('fs');

async function push(sock) {
  try {
    const packagePath = path.join(process.cwd(), 'package.json');
    if (!fs.existsSync(packagePath)) {
      console.error("package.json not found at project root!");
      return;
    }

    const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    const currentVersion = packageData.version || "0.0.0";
    const remoteVersionUrl = 'https://raw.githubusercontent.com/RSF-ARYAN/stuffs/main/raw/package.json';

    let remoteVersion = null;
    try {
      const response = await axios.get(remoteVersionUrl, { timeout: 8000 });
      remoteVersion = response?.data?.version || null;
    } catch (e) {
      console.log("Skip remote version check (network error).");
      return;
    }

    if (!remoteVersion) return;

    const newer = isNewerVersion(remoteVersion, currentVersion);
    if (newer) {
      const message = `
💝 *New Bot Update Available!*

A new version (${remoteVersion}) is available.
Your current version is ${currentVersion}.

Please update your bot to get the latest features and bug fixes.
      `.trim();

      const devPhoneNumber = global.config.devsPhoneNumber;
      if (devPhoneNumber) {
        await sock.sendMessage(devPhoneNumber, { text: message });
      } else {
        console.log("New version available, but 'devsPhoneNumber' is not set in config.json.");
      }
    }
  } catch (error) {
    console.error("Error in push notification:", error?.message || error);
  }
}

function isNewerVersion(remote, current) {
  const r = (remote || "0.0.0").split('.').map(n => parseInt(n || '0', 10));
  const c = (current || "0.0.0").split('.').map(n => parseInt(n || '0', 10));
  for (let i = 0; i < Math.max(r.length, c.length); i++) {
    const rv = r[i] || 0;
    const cv = c[i] || 0;
    if (rv > cv) return true;
    if (rv < cv) return false;
  }
  return false;
}

module.exports = { push };
