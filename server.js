const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const CURRENT_VERSION = '2.1.0';
const RELEASES_API = 'https://api.github.com/repos/wolfderek1/Disk-Cleaner/releases/latest';

const HOME = os.homedir();
const PORT = process.argv[2] || 3501;
const PUBLIC = path.join(__dirname, 'public');

const MIME = {
  '.html': 'text/html',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.json': 'application/json',
};

// ── Scan targets ──────────────────────────────────────────────────────────────
const TARGETS = [
  // Developer — safe
  { id: 'npm_cache',         label: 'npm Cache',                path: `${HOME}/.npm`,                                                                    category: 'Developer', risk: 'safe',    description: 'Cached npm packages. Re-downloaded on next install.' },
  { id: 'node_gyp',          label: 'node-gyp Cache',           path: `${HOME}/Library/Caches/node-gyp`,                                                 category: 'Developer', risk: 'safe',    description: 'Native addon build cache. Rebuilt automatically.' },
  { id: 'genkit',            label: 'Genkit Cache',             path: `${HOME}/.genkit`,                                                                  category: 'Developer', risk: 'safe',    description: 'Google Genkit framework cache.' },
  { id: 'pip_cache',         label: 'pip Cache',                path: `${HOME}/Library/Caches/pip`,                                                      category: 'Developer', risk: 'safe',    description: 'Cached Python packages.' },
  { id: 'yarn_cache',        label: 'Yarn Cache',               path: `${HOME}/.yarn/cache`,                                                             category: 'Developer', risk: 'safe',    description: 'Cached Yarn packages.' },
  { id: 'bun_cache',         label: 'Bun Cache',                path: `${HOME}/.bun/install/cache`,                                                      category: 'Developer', risk: 'safe',    description: 'Cached Bun packages.' },
  { id: 'gradle_cache',      label: 'Gradle Cache',             path: `${HOME}/.gradle/caches`,                                                          category: 'Developer', risk: 'safe',    description: 'Cached Gradle build artifacts.' },
  { id: 'maven_cache',       label: 'Maven Cache',              path: `${HOME}/.m2/repository`,                                                          category: 'Developer', risk: 'safe',    description: 'Cached Maven dependencies.' },
  { id: 'cargo_registry',    label: 'Cargo Registry',           path: `${HOME}/.cargo/registry`,                                                         category: 'Developer', risk: 'safe',    description: 'Cached Rust crates.' },
  { id: 'xcode_derived',     label: 'Xcode DerivedData',        path: `${HOME}/Library/Developer/Xcode/DerivedData`,                                     category: 'Developer', risk: 'safe',    description: 'Xcode build artifacts. Rebuilt on next build.' },
  { id: 'sim_cache',         label: 'Simulator Cache',          path: '/Library/Developer/CoreSimulator/Caches',                                         category: 'Developer', risk: 'safe',    description: 'CoreSimulator runtime caches.' },
  { id: 'arduino_staging',   label: 'Arduino Staging Cache',    path: `${HOME}/Library/Arduino15/staging`,                                               category: 'Developer', risk: 'safe',    description: 'Downloaded Arduino installer cache.' },
  // Developer — caution
  { id: 'xcode_archives',    label: 'Xcode Archives',           path: `${HOME}/Library/Developer/Xcode/Archives`,                                        category: 'Developer', risk: 'caution', description: 'App archives. Delete if you no longer need old builds.' },
  { id: 'ios_simulators',    label: 'iOS Simulators',           path: `${HOME}/Library/Developer/CoreSimulator/Devices`,                                 category: 'Developer', risk: 'caution', description: 'Simulator images. Re-downloadable via Xcode.' },
  { id: 'arduino_packages',  label: 'Arduino Board Packages',   path: `${HOME}/Library/Arduino15/packages`,                                              category: 'Developer', risk: 'caution', description: 'Board toolchains. Re-installable via Arduino IDE.' },
  { id: 'vscode_extensions', label: 'VSCode Extensions',        path: `${HOME}/.vscode/extensions`,                                                      category: 'Developer', risk: 'caution', description: 'Installed VSCode extensions. Re-installable.' },
  { id: 'vscode_vsix',       label: 'VSCode Extension Packages', path: `${HOME}/Library/Application Support/Code/CachedExtensionVSIXs`,                  category: 'Developer', risk: 'safe',    description: 'Cached VSCode extension installer files. Re-downloaded on update.' },
  { id: 'docker_data',       label: 'Docker Data',              path: `${HOME}/Library/Containers/com.docker.docker/Data`,                               category: 'Developer', risk: 'caution', description: 'Docker images/containers. Remove via Docker Desktop.' },
  // App caches — safe
  { id: 'app_caches',        label: 'App Caches',               path: `${HOME}/Library/Caches`,                                                          category: 'App Caches', risk: 'safe',   description: 'General application caches.' },
  { id: 'notif_cache',       label: 'Notification Attachments', path: `${HOME}/Library/Group Containers/group.com.apple.UserNotifications/Library/UserNotifications/Remote`, category: 'App Caches', risk: 'safe', description: 'Cached images/videos from push notifications.' },
  { id: 'claude_cache',      label: 'Claude App Cache',         path: `${HOME}/Library/Application Support/Claude/Code Cache`,                           category: 'App Caches', risk: 'safe',   description: 'Claude desktop app web cache.' },
  { id: 'brave_cache',       label: 'Brave Cache',              path: `${HOME}/Library/Application Support/BraveSoftware/Brave-Browser/Default/Cache`,   category: 'App Caches', risk: 'safe',   description: 'Brave browser cache.' },
  { id: 'chrome_cache',      label: 'Chrome Cache',             path: `${HOME}/Library/Application Support/Google/Chrome/Default/Cache`,                 category: 'App Caches', risk: 'safe',   description: 'Chrome browser cache.' },
  { id: 'chrome_code_cache', label: 'Chrome Code Cache',        path: `${HOME}/Library/Application Support/Google/Chrome/Default/Code Cache`,            category: 'App Caches', risk: 'safe',   description: 'Chrome JavaScript code cache.' },
  { id: 'chrome_gpu_cache',  label: 'Chrome GPU Cache',         path: `${HOME}/Library/Application Support/Google/Chrome/Default/GPUCache`,              category: 'App Caches', risk: 'safe',   description: 'Chrome GPU shader cache.' },
  { id: 'google_updater',    label: 'Google Updater Cache',     path: `${HOME}/Library/Application Support/Google/GoogleUpdater`,                        category: 'App Caches', risk: 'safe',   description: 'Google app updater cache. Re-downloads on next update check.' },
  { id: 'safari_cache',      label: 'Safari Cache',             path: `${HOME}/Library/Caches/com.apple.Safari`,                                         category: 'App Caches', risk: 'safe',   description: 'Safari browser cache.' },
  { id: 'messages_cache',    label: 'Messages Cache',           path: `${HOME}/Library/Messages/Caches`,                                                  category: 'App Caches', risk: 'safe',   description: 'iMessage app cache. Can exceed 2GB. Rebuilds automatically.' },
  { id: 'messages_nick',     label: 'Messages NickName Cache',  path: `${HOME}/Library/Messages/NickNameCache`,                                           category: 'App Caches', risk: 'safe',   description: 'Cached contact display names for Messages.' },
  { id: 'wallpaper_cache',   label: 'Wallpaper Cache',          path: `${HOME}/Library/Application Support/com.apple.wallpaper`,                         category: 'App Caches', risk: 'safe',   description: 'macOS wallpaper data cache. Regenerated automatically.' },
  { id: 'maps_cache',        label: 'Maps & Location Cache',    path: `${HOME}/Library/Containers/com.apple.geod/Data/Library/Caches`,                   category: 'App Caches', risk: 'safe',   description: 'Cached map tiles and location data. Re-downloads on use.' },
  { id: 'media_analysis',    label: 'Photo Media Analysis Cache', path: `${HOME}/Library/Containers/com.apple.mediaanalysisd/Data/Library/Caches`,       category: 'App Caches', risk: 'safe',   description: 'AI photo analysis cache. Rebuilds in background.' },
  // System — safe
  { id: 'user_logs',         label: 'User Logs',                path: `${HOME}/Library/Logs`,                                                            category: 'System',    risk: 'safe',    description: 'Application log files.' },
  { id: 'trash',             label: 'Trash',                    path: `${HOME}/.Trash`,                                                                  category: 'System',    risk: 'safe',    description: 'Files in Trash.' },
  { id: 'biome_streams',     label: 'Apple Biome Streams',      path: `${HOME}/Library/Biome/streams`,                                                   category: 'System',    risk: 'safe',    description: 'Apple on-device behavioral tracking data. Safe to clear, rebuilds automatically.' },
  // System — caution
  { id: 'spotlight_index',   label: 'Spotlight Search Index',   path: `${HOME}/Library/Metadata/CoreSpotlight`,                                          category: 'System',    risk: 'caution', description: 'Spotlight search index. Deleting forces a full reindex — search will be slow for ~1 hour.' },
  // User Data — danger
  { id: 'downloads',         label: 'Downloads',                path: `${HOME}/Downloads`,                                                               category: 'User Data', risk: 'danger',  description: 'Your Downloads folder. Review manually.' },
  { id: 'documents',         label: 'Documents',                path: `${HOME}/Documents`,                                                               category: 'User Data', risk: 'danger',  description: 'Personal documents.' },
  { id: 'desktop',           label: 'Desktop',                  path: `${HOME}/Desktop`,                                                                 category: 'User Data', risk: 'danger',  description: 'Files on your Desktop.' },
  { id: 'pictures',          label: 'Pictures',                 path: `${HOME}/Pictures`,                                                                category: 'User Data', risk: 'danger',  description: 'Your photo library and images.' },
  { id: 'music',             label: 'Music',                    path: `${HOME}/Music`,                                                                   category: 'User Data', risk: 'danger',  description: 'Your music library.' },
  { id: 'movies',            label: 'Movies',                   path: `${HOME}/Movies`,                                                                  category: 'User Data', risk: 'danger',  description: 'Your video files.' },
  { id: 'messages',          label: 'Messages',                 path: `${HOME}/Library/Messages`,                                                        category: 'User Data', risk: 'danger',  description: 'iMessage history and attachments.' },
  { id: 'mail',              label: 'Mail',                     path: `${HOME}/Library/Mail`,                                                            category: 'User Data', risk: 'danger',  description: 'Locally stored email.' },
  // App Data — danger
  { id: 'claude_vm',         label: 'Claude VM Bundle',         path: `${HOME}/Library/Application Support/Claude/vm_bundles`,                           category: 'App Data',  risk: 'danger',  description: 'Required by Claude desktop for its sandbox.' },
  { id: 'icloud',            label: 'iCloud Drive Cache',       path: `${HOME}/Library/Mobile Documents`,                                                category: 'App Data',  risk: 'danger',  description: 'Local iCloud Drive cache. Managed by macOS.' },
  { id: 'applications',      label: 'Applications',             path: '/Applications',                                                                   category: 'App Data',  risk: 'danger',  description: 'Installed applications. Uninstall via Finder.' },
  { id: 'local_share',       label: 'Local App Data',           path: `${HOME}/.local/share`,                                                            category: 'App Data',  risk: 'danger',  description: 'Various application state data.' },
  { id: 'config',            label: 'Config Files',             path: `${HOME}/.config`,                                                                 category: 'App Data',  risk: 'danger',  description: 'Application configuration files.' },
];

function getDirSize(p) {
  try {
    if (!fs.existsSync(p)) return 0;
    const out = execSync(`du -sk "${p}" 2>/dev/null`, { timeout: 60000 }).toString().trim();
    const kb = parseInt(out.split('\t')[0], 10);
    return isNaN(kb) ? 0 : kb * 1024;
  } catch { return 0; }
}

function fmtSize(b) {
  if (!b) return '0 B';
  const u = ['B','KB','MB','GB'];
  const i = Math.floor(Math.log(b) / Math.log(1024));
  return (b / Math.pow(1024, i)).toFixed(1) + ' ' + u[i];
}

function getDiskInfo() {
  try {
    const out = execSync('diskutil info /').toString();
    const get = label => {
      const m = out.match(new RegExp(label + ':\\s+[\\d.]+ \\w+ \\((\\d+) Bytes\\)'));
      return m ? parseInt(m[1], 10) : 0;
    };
    const total = get('Container Total Space');
    const avail = get('Container Free Space');
    return { total, used: total - avail, avail };
  } catch { return null; }
}

function serveFile(res, filePath) {
  try {
    const data = fs.readFileSync(filePath);
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'text/plain' });
    res.end(data);
  } catch {
    res.writeHead(404); res.end('Not found');
  }
}

function json(res, data) {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  if (req.url === '/api/disk') {
    return json(res, getDiskInfo());
  }

  if (req.url === '/api/scan') {
    const results = TARGETS.map(t => {
      const exists = fs.existsSync(t.path);
      const size   = exists ? getDirSize(t.path) : 0;
      return { ...t, size, sizeFormatted: fmtSize(size), exists, deletable: t.risk !== 'danger' };
    });
    return json(res, results);
  }

  if (req.url === '/api/scan-stream') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    const send = (type, data) => res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);

    send('start', { total: TARGETS.length });

    const results = [];
    for (const t of TARGETS) {
      const cmd = `du -sk "${t.path}"`;
      send('cmd', { cmd, label: t.label });

      const exists = fs.existsSync(t.path);
      let size = 0;
      let output = '';

      if (!exists) {
        output = `no such file or directory: ${t.path}`;
        send('output', { output, exists: false });
      } else {
        try {
          const raw = execSync(`${cmd} 2>&1`, { timeout: 60000 }).toString().trim();
          const kb  = parseInt(raw.split('\t')[0], 10);
          size      = isNaN(kb) ? 0 : kb * 1024;
          output    = raw;
          send('output', { output, exists: true, size, sizeFormatted: fmtSize(size) });
        } catch (e) {
          output = e.message;
          send('output', { output, exists: true, size: 0, error: true });
        }
      }

      results.push({ ...t, size, sizeFormatted: fmtSize(size), exists, deletable: t.risk !== 'danger' });
    }

    send('done', { results });
    res.end();
    return;
  }

  if (req.url === '/api/delete' && req.method === 'POST') {
    let body = '';
    req.on('data', d => body += d);
    req.on('end', () => {
      const { ids = [] } = JSON.parse(body);
      const results = ids.map(id => {
        const t = TARGETS.find(x => x.id === id);
        if (!t) return { id, success: false, error: 'Unknown' };
        if (t.risk === 'danger') return { id, success: false, error: 'Protected' };
        if (!fs.existsSync(t.path)) return { id, success: true };
        try { execSync(`rm -rf "${t.path}"`, { timeout: 60000 }); return { id, success: true }; }
        catch (e) { return { id, success: false, error: e.message }; }
      });
      json(res, { results, disk: getDiskInfo() });
    });
    return;
  }

  if (req.url === '/api/delete-stream' && req.method === 'POST') {
    let body = '';
    req.on('data', d => body += d);
    req.on('end', () => {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      });

      const send = (type, data) => res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);
      const { ids = [] } = JSON.parse(body);

      send('start', { total: ids.length });

      const results = [];
      for (const id of ids) {
        const t = TARGETS.find(x => x.id === id);
        if (!t) { send('result', { id, success: false, error: 'Unknown target' }); continue; }
        if (t.risk === 'danger') { send('result', { id, success: false, error: 'Protected' }); continue; }

        const cmd = `rm -rf "${t.path}"`;
        send('cmd', { cmd, label: t.label });

        if (!fs.existsSync(t.path)) {
          send('output', { output: 'already removed — skipped', success: true });
          results.push({ id, success: true });
          continue;
        }

        try {
          execSync(cmd, { timeout: 60000 });
          send('output', { output: `removed ${t.path}`, success: true });
          results.push({ id, success: true });
        } catch (e) {
          send('output', { output: e.message, success: false, error: true });
          results.push({ id, success: false, error: e.message });
        }
      }

      send('done', { results, disk: getDiskInfo() });
      res.end();
    });
    return;
  }

  if (req.url === '/api/check-update') {
    const options = {
      hostname: 'api.github.com',
      path: '/repos/wolfderek1/Disk-Cleaner/releases/latest',
      headers: { 'User-Agent': 'DiskCleaner/' + CURRENT_VERSION },
    };
    https.get(options, (r) => {
      let data = '';
      r.on('data', c => data += c);
      r.on('end', () => {
        try {
          const release = JSON.parse(data);
          const latest = (release.tag_name || '').replace(/^v/, '');
          const hasUpdate = latest && latest !== CURRENT_VERSION;
          json(res, {
            current: CURRENT_VERSION,
            latest: latest || CURRENT_VERSION,
            hasUpdate,
            url: release.html_url || '',
            name: release.name || latest,
          });
        } catch {
          json(res, { current: CURRENT_VERSION, latest: CURRENT_VERSION, hasUpdate: false });
        }
      });
    }).on('error', () => {
      json(res, { current: CURRENT_VERSION, latest: CURRENT_VERSION, hasUpdate: false });
    });
    return;
  }

  // Static files
  const safePath = req.url === '/' ? '/index.html' : req.url;
  serveFile(res, path.join(PUBLIC, safePath));
});

server.listen(PORT, '127.0.0.1', () => {
  process.stdout.write(`ready:${PORT}\n`);
});
