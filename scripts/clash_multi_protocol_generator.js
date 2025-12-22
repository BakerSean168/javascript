#!/usr/bin/env node
/*
clash_multi_protocol_generator.js

Single generator script that:
- Reads an input text file (one URL per line) containing mixed proxy URLs (vmess/vless/trojan/ss)
- Parses each URL intelligently and normalizes into Clash.Meta proxy objects
- Produces:
    1) a combined YAML containing all proxies (clash_yaml/all-<timestamp>.yaml)
    2) per-protocol YAML files (clash_yaml/vmess-<timestamp>.yaml, vless-..., trojan-..., ss-...)
- Uses the provided rule-providers and base Clash template
- Tries to auto-fill transport-specific options (ws, h2, grpc, http-upgrade)

Dependencies:
  npm install js-yaml minimist mkdirp

Usage:
  node clash_multi_protocol_generator.js --input urls.txt
  node clash_multi_protocol_generator.js --input urls.txt --outdir ./clash_yaml

Input format:
  - One URL per line. Supported schemes: vmess://, vless://, trojan://, ss://
  - Lines starting with # are ignored

This file was adapted from the user's trojan/vless sample scripts and enhanced to meet requirements.
*/

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const argv = require('minimist')(process.argv.slice(2));
const mkdirp = require('mkdirp');

const DEFAULT_INPUT = 'asserts/1.txt';
const OUT_DIR = argv.outdir || './clash_yaml';

function timestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function makeBaseClash() {
  return {
    port: 7890,
    'socks-port': 7891,
    'allow-lan': false,
    mode: 'Rule',
    'log-level': 'info',
    proxies: [],
    'rule-providers': {
      reject: { type: 'http', behavior: 'domain', url: 'https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/reject.txt', path: './ruleset/reject.yaml', interval: 86400 },
      icloud: { type: 'http', behavior: 'domain', url: 'https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/icloud.txt', path: './ruleset/icloud.yaml', interval: 86400 },
      apple: { type: 'http', behavior: 'domain', url: 'https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/apple.txt', path: './ruleset/apple.yaml', interval: 86400 },
      proxy: { type: 'http', behavior: 'domain', url: 'https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/proxy.txt', path: './ruleset/proxy.yaml', interval: 86400 },
      direct: { type: 'http', behavior: 'domain', url: 'https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/direct.txt', path: './ruleset/direct.yaml', interval: 86400 },
      private: { type: 'http', behavior: 'domain', url: 'https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/private.txt', path: './ruleset/private.yaml', interval: 86400 },
      gfw: { type: 'http', behavior: 'domain', url: 'https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/gfw.txt', path: './ruleset/gfw.yaml', interval: 86400 },
      'tld-not-cn': { type: 'http', behavior: 'domain', url: 'https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/tld-not-cn.txt', path: './ruleset/tld-not-cn.yaml', interval: 86400 },
      telegramcidr: { type: 'http', behavior: 'ipcidr', url: 'https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/telegramcidr.txt', path: './ruleset/telegramcidr.yaml', interval: 86400 },
      cncidr: { type: 'http', behavior: 'ipcidr', url: 'https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/cncidr.txt', path: './ruleset/cncidr.yaml', interval: 86400 },
      lancidr: { type: 'http', behavior: 'ipcidr', url: 'https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/lancidr.txt', path: './ruleset/lancidr.yaml', interval: 86400 },
      applications: { type: 'http', behavior: 'classical', url: 'https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/applications.txt', path: './ruleset/applications.yaml', interval: 86400 }
    },
    'proxy-groups': [ { name: 'PROXY', type: 'select', proxies: [] } ],
    rules: [
      'RULE-SET,applications,DIRECT',
      'DOMAIN,clash.razord.top,DIRECT',
      'DOMAIN,yacd.haishan.me,DIRECT',
      'RULE-SET,private,DIRECT',
      'RULE-SET,reject,REJECT',
      'RULE-SET,icloud,DIRECT',
      'RULE-SET,apple,DIRECT',
      'RULE-SET,proxy,PROXY',
      'RULE-SET,direct,DIRECT',
      'RULE-SET,lancidr,DIRECT',
      'RULE-SET,cncidr,DIRECT',
      'RULE-SET,telegramcidr,PROXY',
      'GEOIP,LAN,DIRECT,no-resolve',
      'GEOIP,CN,DIRECT,no-resolve',
      'MATCH,PROXY'
    ]
  };
}

// ===== parsers for different schemes =====
function parseVlessUrl(url) {
  try {
    const raw = url.replace(/^vless:\/\//i, '');
    const [main, name] = raw.split('#');
    const [left, qs] = main.split('?');
    const [user, hostport] = left.split('@');
    const [server, port] = hostport.split(':');
    const params = new URLSearchParams(qs || '');
    return {
      proto: 'vless',
      name: decodeURIComponent(name || `vless-${server}-${port}`),
      server: server,
      port: Number(port || 443),
      uuid: user,
      flow: params.get('flow') || undefined,
      sni: params.get('sni') || undefined,
      network: (params.get('type') || params.get('net') || 'tcp').toLowerCase(),
      host: params.get('host') || undefined,
      path: params.get('path') || undefined,
      pbk: params.get('pbk') || undefined,
      fp: params.get('fp') || undefined,
      security: params.get('security') || params.get('tls') ? 'tls' : undefined
    };
  } catch (e) { return null; }
}

function parseTrojanUrl(url) {
  try {
    // trojan://password@server:port?params#name
    const raw = url.replace(/^trojan:\/\//i, '');
    const [main, name] = raw.split('#');
    const [left, qs] = main.split('?');
    const [password, hostport] = left.split('@');
    const [server, port] = hostport.split(':');
    const params = new URLSearchParams(qs || '');
    return {
      proto: 'trojan',
      name: decodeURIComponent(name || `trojan-${server}-${port}`),
      server: server,
      port: Number(port || 443),
      password: password,
      sni: params.get('sni') || undefined,
      network: (params.get('type') || params.get('net') || 'tcp').toLowerCase(),
      host: params.get('host') || params.get('sni') || undefined,
      path: params.get('path') || undefined
    };
  } catch (e) { return null; }
}

function parseVmessUrl(url) {
  try {
    // vmess://base64(json)
    const raw = url.replace(/^vmess:\/\//i, '');
    const decoded = Buffer.from(raw, 'base64').toString();
    const j = JSON.parse(decoded);
    // fields: add, port, id, aid, net, type, host, path, tls
    return {
      proto: 'vmess',
      name: j.ps || `${j.add}-${j.port}`,
      server: j.add,
      port: Number(j.port || 0),
      uuid: j.id || j.uuid || undefined,
      alterId: j.aid || j.alterId || undefined,
      network: (j.net || j.type || 'tcp').toLowerCase(),
      host: j.host || j.hosts || undefined,
      path: j.path || undefined,
      tls: j.tls === 'tls' || !!j.tls
    };
  } catch (e) { return null; }
}

function parseSsUrl(url) {
  try {
    // support ss://BASE64 or ss://method:pass@host:port#name
    const raw = url.replace(/^ss:\/\//i, '');
    let name = null;
    if (raw.includes('#')) {
      const parts = raw.split('#');
      name = decodeURIComponent(parts[1]);
    }
    if (raw.includes('@')) {
      // method:pass@host:port
      const [left, right] = raw.split('@');
      const [method, password] = left.split(':');
      const [host, port] = right.split(':');
      return { proto: 'ss', name: name || `${host}-${port}`, server: host, port: Number(port), method, password };
    } else {
      // Base64 form
      const decoded = Buffer.from(raw, 'base64').toString();
      // decoded => method:password@host:port
      const [credentials, hostport] = decoded.split('@');
      const [method, password] = credentials.split(':');
      const [host, port] = hostport.split(':');
      return { proto: 'ss', name: name || `${host}-${port}`, server: host, port: Number(port), method, password };
    }
  } catch (e) { return null; }
}

function parseLine(line) {
  const t = line.trim();
  if (!t || t.startsWith('#')) return null;
  if (/^vless:\/\//i.test(t)) return parseVlessUrl(t);
  if (/^trojan:\/\//i.test(t)) return parseTrojanUrl(t);
  if (/^vmess:\/\//i.test(t)) return parseVmessUrl(t);
  if (/^ss:\/\//i.test(t)) return parseSsUrl(t);
  // fallback: try to detect by prefix
  return null;
}

// ===== builders for clash proxy objects =====
function makeVlessProxy(p) {
  if (!p || !p.server || !p.port || !p.uuid) return null;
  const network = (p.network || 'tcp').toLowerCase();
  const host = p.host || p.sni || p.server;
  const pathVal = p.path || ('/' + p.uuid);
  const proxy = {
    name: p.name,
    type: 'vless',
    server: p.server,
    port: Number(p.port),
    uuid: p.uuid,
    udp: p.udp === undefined ? true : !!p.udp,
    'skip-cert-verify': p['skip-cert-verify'] === undefined ? false : !!p['skip-cert-verify'],
    sni: p.sni || host || undefined,
    network: network,
    alpn: p.alpn || ['h2', 'http/1.1']
  };
  if (p.security === 'reality') {
    proxy['client-fingerprint'] = p.fp || 'chrome';
    proxy['reality-opts'] = { 'public-key': p.pbk, 'short-id': p.sid || '' };
  } else {
    proxy.tls = p.tls === undefined ? true : !!p.tls;
  }
  if (network === 'ws') proxy['ws-opts'] = { path: pathVal, headers: { Host: host } };
  if (network === 'h2') proxy['h2-opts'] = { host: [host], path: pathVal };
  if (network === 'grpc') proxy['grpc-opts'] = { 'grpc-service-name': p['grpc-service-name'] || '' };
  if (network === 'httpupgrade' || network === 'http-upgrade' || network === 'http') proxy['http-upgrade-opts'] = { host: host, path: pathVal };
  return proxy;
}

function makeTrojanProxy(p) {
  if (!p || !p.server || !p.port || !p.password) return null;
  const network = (p.network || 'tcp').toLowerCase();
  const host = p.host || p.sni || p.server;
  const pathVal = p.path || ('/' + p.password);
  const proxy = {
    name: p.name,
    type: 'trojan',
    server: p.server,
    port: Number(p.port),
    password: p.password,
    udp: p.udp === undefined ? true : !!p.udp,
    sni: p.sni || host || undefined,
    'skip-cert-verify': p['skip-cert-verify'] === undefined ? false : !!p['skip-cert-verify'],
    network: network,
    alpn: p.alpn || ['h2', 'http/1.1']
  };
  if (network === 'ws') proxy['ws-opts'] = { path: pathVal, headers: { Host: host } };
  if (network === 'h2') proxy['h2-opts'] = { host: [host], path: pathVal };
  if (network === 'httpupgrade' || network === 'http-upgrade' || network === 'http') proxy['http-upgrade-opts'] = { host: host, path: pathVal };
  return proxy;
}

function makeVmessProxy(p) {
  if (!p || !p.server || !p.port) return null;
  const network = (p.network || 'tcp').toLowerCase();
  const host = Array.isArray(p.host) ? p.host[0] : p.host || p.server;
  const pathVal = p.path || '/';
  const proxy = {
    name: p.name,
    type: 'vmess',
    server: p.server,
    port: Number(p.port),
    uuid: p.uuid || p.id || undefined,
    alterId: p.alterId || undefined,
    cipher: p.cipher || undefined,
    udp: p.udp === undefined ? true : !!p.udp,
    'skip-cert-verify': p['skip-cert-verify'] === undefined ? false : !!p['skip-cert-verify'],
    network: network,
    alpn: p.alpn || ['h2', 'http/1.1']
  };
  if (network === 'ws') proxy['ws-opts'] = { path: pathVal, headers: { Host: host } };
  if (network === 'h2') proxy['h2-opts'] = { host: [host], path: pathVal };
  if (network === 'grpc') proxy['grpc-opts'] = { 'grpc-service-name': p['grpc-service-name'] || '' };
  if (network === 'httpupgrade' || network === 'http-upgrade' || network === 'http') proxy['http-upgrade-opts'] = { host: host, path: pathVal };
  if (p.tls) proxy.tls = true;
  return proxy;
}

function makeSsProxy(p) {
  if (!p || !p.server || !p.port || !p.method) return null;
  return {
    name: p.name,
    type: 'ss',
    server: p.server,
    port: Number(p.port),
    cipher: p.method,
    password: p.password || '',
    udp: p.udp === undefined ? true : !!p.udp
  };
}

// ===== main flow =====
function readInputFile(infile) {
  try {
    const raw = fs.readFileSync(infile, 'utf8');
    return raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  } catch (e) { console.error('Failed to read input file:', e.message); process.exit(2); }
}

function ensureOut(dir) {
  try { mkdirp.sync(dir); } catch (e) { console.error('Failed to create out dir:', e.message); process.exit(3); }
}

function buildProxies(lines) {
  const parsed = [];
  for (const ln of lines) {
    const p = parseLine(ln);
    if (!p) {
      console.warn('Ignored or unrecognized line:', ln.slice(0,80));
      continue;
    }
    // derive missing name
    if (!p.name) p.name = `${p.proto}-${p.server || 'host'}-${p.port || '0'}`;
    // builder per proto
    let proxyObj = null;
    if (p.proto === 'vless') proxyObj = makeVlessProxy(p);
    if (p.proto === 'trojan') proxyObj = makeTrojanProxy(p);
    if (p.proto === 'vmess') proxyObj = makeVmessProxy(p);
    if (p.proto === 'ss') proxyObj = makeSsProxy(p);
    if (!proxyObj) {
      console.warn('Failed to create proxy for line:', ln.slice(0,80));
      continue;
    }
    parsed.push({ proto: p.proto, raw: p, clash: proxyObj });
  }
  return parsed;
}

function writeYamlFiles(parsed, outdir) {
  const ts = timestamp();
  // group by proto
  const byProto = parsed.reduce((acc, item) => {
    acc[item.proto] = acc[item.proto] || [];
    acc[item.proto].push(item.clash);
    return acc;
  }, {});

  // combined
  const allClash = makeBaseClash();
  allClash.proxies = parsed.map(p => p.clash);
  allClash['proxy-groups'][0].proxies = allClash.proxies.map(x => x.name);
  const allFile = path.join(outdir, `all-${ts}.yaml`);
  fs.writeFileSync(allFile, yaml.dump(allClash, { lineWidth: -1 }), 'utf8');
  console.log('Wrote combined file ->', allFile);

  // per-protocol
  for (const proto of Object.keys(byProto)) {
    const c = makeBaseClash();
    c.proxies = byProto[proto];
    c['proxy-groups'][0].proxies = c.proxies.map(x => x.name);
    const fn = path.join(outdir, `${proto}-${ts}.yaml`);
    fs.writeFileSync(fn, yaml.dump(c, { lineWidth: -1 }), 'utf8');
    console.log(`Wrote ${proto} file ->`, fn);
  }
}

function main() {
  const infile = argv.input || argv._[0] || DEFAULT_INPUT;
  ensureOut(OUT_DIR);
  const lines = readInputFile(path.resolve(infile));
  const parsed = buildProxies(lines);
  if (parsed.length === 0) { console.error('No valid proxies parsed.'); process.exit(1); }
  writeYamlFiles(parsed, OUT_DIR);
}

if (require.main === module) main();
