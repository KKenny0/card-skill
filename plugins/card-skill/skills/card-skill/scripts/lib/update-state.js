'use strict';

const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const SLEEP_BUFFER = new Int32Array(new SharedArrayBuffer(4));
const LOCK_STALE_MS = 10 * 60 * 1000;

function normalizedRoot(root) {
  try {
    return fs.realpathSync.native(root);
  } catch {
    return path.resolve(root);
  }
}

function installationIdentity(root) {
  return normalizedRoot(root).replaceAll('\\', '/').replace(
    /(\/plugins\/cache\/card-skill\/card-skill\/)[^/]+(\/skills\/card-skill)\/?$/i,
    '$1<version>$2',
  );
}

function installationId(root) {
  return crypto.createHash('sha256').update(installationIdentity(root)).digest('hex').slice(0, 16);
}

function defaultCachePath(root) {
  const cacheRoot = process.env.XDG_CACHE_HOME || path.join(os.homedir(), '.cache');
  return path.join(cacheRoot, 'card-skill', installationId(root), 'update-check.json');
}

function statePaths(root, cacheOverride = null) {
  const cachePath = cacheOverride || defaultCachePath(root);
  const stateDir = path.dirname(cachePath);
  return {
    cachePath,
    stateDir,
    updateLock: path.join(stateDir, 'update.lock'),
    renderDir: path.join(stateDir, 'renders'),
  };
}

function sleep(milliseconds) {
  Atomics.wait(SLEEP_BUFFER, 0, 0, milliseconds);
}

function pidIsAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code === 'EPERM';
  }
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function removeStaleUpdateLock(lockPath) {
  const lock = readJson(path.join(lockPath, 'owner.json'));
  let createdAt = Number(lock?.createdAt || 0);
  if (!createdAt) {
    try {
      createdAt = fs.statSync(lockPath).mtimeMs;
    } catch {
      return false;
    }
  }
  const age = Date.now() - createdAt;
  if (pidIsAlive(Number(lock?.pid)) || age < LOCK_STALE_MS) return false;
  try {
    fs.rmSync(lockPath, { recursive: true, force: true });
    return true;
  } catch {
    return false;
  }
}

function waitForUpdate(root, cacheOverride = null, timeoutMs = 120000) {
  const { updateLock } = statePaths(root, cacheOverride);
  const deadline = Date.now() + timeoutMs;
  let waited = false;
  while (fs.existsSync(updateLock)) {
    waited = true;
    if (removeStaleUpdateLock(updateLock)) continue;
    if (Date.now() >= deadline) return { ready: false, waited };
    sleep(100);
  }
  return { ready: true, waited };
}

function beginRender(root, cacheOverride = null) {
  const paths = statePaths(root, cacheOverride);
  fs.mkdirSync(paths.renderDir, { recursive: true });
  let waited = false;
  while (true) {
    const wait = waitForUpdate(root, cacheOverride);
    waited ||= wait.waited;
    if (!wait.ready) return { ready: false, waited, end() {} };

    const leasePath = path.join(paths.renderDir, `${process.pid}.json`);
    fs.writeFileSync(leasePath, JSON.stringify({ pid: process.pid, createdAt: Date.now() }));
    if (!fs.existsSync(paths.updateLock)) {
      let ended = false;
      return {
        ready: true,
        waited,
        end() {
          if (ended) return;
          ended = true;
          try {
            fs.unlinkSync(leasePath);
          } catch {}
        },
      };
    }
    try {
      fs.unlinkSync(leasePath);
    } catch {}
    waited = true;
  }
}

function activeRenderPids(root, cacheOverride = null) {
  const { renderDir } = statePaths(root, cacheOverride);
  let entries = [];
  try {
    entries = fs.readdirSync(renderDir);
  } catch {
    return [];
  }
  const active = [];
  for (const entry of entries) {
    const leasePath = path.join(renderDir, entry);
    const lease = readJson(leasePath);
    const pid = Number(lease?.pid);
    if (pidIsAlive(pid)) {
      active.push(pid);
    } else {
      try {
        fs.unlinkSync(leasePath);
      } catch {}
    }
  }
  return active;
}

function acquireUpdateLock(root, cacheOverride = null) {
  const paths = statePaths(root, cacheOverride);
  fs.mkdirSync(paths.stateDir, { recursive: true });
  try {
    fs.mkdirSync(paths.updateLock);
  } catch (error) {
    if (error?.code === 'EEXIST' && removeStaleUpdateLock(paths.updateLock)) {
      return acquireUpdateLock(root, cacheOverride);
    }
    return null;
  }
  fs.writeFileSync(
    path.join(paths.updateLock, 'owner.json'),
    JSON.stringify({ pid: process.pid, createdAt: Date.now() }),
  );
  let released = false;
  return {
    release() {
      if (released) return;
      released = true;
      try {
        fs.rmSync(paths.updateLock, { recursive: true, force: true });
      } catch {}
    },
  };
}

module.exports = {
  acquireUpdateLock,
  activeRenderPids,
  beginRender,
  defaultCachePath,
  installationIdentity,
  installationId,
  normalizedRoot,
  statePaths,
};
