#!/usr/bin/env node
/*
Trojan -> Clash.Meta YAML generator (Node.js)

Features:
- Generate Clash.Meta compatible YAML with Trojan proxies
- Accept proxies via JSON file, CLI args, or interactive prompt
- Provides a reusable Trojan proxy template (supports ws / h2 / httpupgrade)
- Writes output to stdout or to a file

Usage examples:
  # install dependency
  npm install js-yaml minimist

  # generate from a JSON file (array of proxies)
  node trojan-clash-generator.js --input proxies.json --output config.yaml

  # generate with a single proxy via CLI
  node trojan-clash-generator.js --name hk233 --server example.com --port 443 --password secret --network h2 --host example.com --path /secret --output config.yaml

JSON proxy object example (array):
[
  {
    "name": "hk233",
    "server": "example.com",
    "port": 443,
    "password": "secret",
    "sni": "example.com",
    "network": "h2",
    "host": "example.com",
    "path": "/secret"
  }
]
*/

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const argv = require('minimist')(process.argv.slice(2));

function usage() {
  console.log('\nTrojan -> Clash.Meta YAML generator');
  console.log('Usage: node trojan-clash-generator.js [--input proxies.json] [--output clash.yaml]');
  console.log('       or pass single proxy via --name --server --port --password --network --host --path');
  console.log('Options:');
  console.log('  --input        JSON file containing array of proxy objects');
  console.log('  --output       YAML output file (default: stdout)');
  console.log('  --template     Show the built-in proxy template example');
  console.log('  --help         Show this help');
  process.exit(0);
}

if (argv.help) usage();
if (argv.template) {
  console.log('\nBuilt-in Trojan template (fields shown):\n');
  console.log(JSON.stringify({
    name: 'hk233',
    type: 'trojan',
    server: 'example.com',
    port: 443,
    password: '9232aa42-00e0-4a0a-aa86-b412503d32fb',
    udp: true,
    sni: 'example.com',
    'skip-cert-verify': false,
    network: 'h2',
    'ws-opts': { path: '/9232aa42-00e0-4a0a-aa86-b412503d32fb', headers: { Host: 'example.com' } },
    'h2-opts': { host: ['example.com'], path: '/9232aa42-00e0-4a0a-aa86-b412503d32fb' },
    'http-upgrade-opts': { host: 'example.com', path: '/9232aa42-00e0-4a0a-aa86-b412503d32fb' },
    alpn: ['h2', 'http/1.1']
  }, null, 2));
  process.exit(0);
}

// Helper: create a trojan proxy object from minimal input
function makeTrojanProxy(p) {
  // required fields: name, server, port, password
  if (!p || !p.name || !p.server || !p.port || !p.password) return null;
  const network = (p.network || '').toLowerCase();
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
    network: network || 'tcp',
    alpn: p.alpn || ['h2', 'http/1.1']
  };

  // network-specific options
  if (network === 'ws') {
    proxy['ws-opts'] = {
      path: pathVal,
      headers: { Host: host }
    };
  }
  if (network === 'h2') {
    proxy['h2-opts'] = {
      host: [host],
      path: pathVal
    };
  }
  if (network === 'httpupgrade' || network === 'http-upgrade' || network === 'http') {
    proxy['http-upgrade-opts'] = {
      host: host,
      path: pathVal
    };
  }

  return proxy;
}

// Default base clash structure (based on user's reference)
function makeBaseClash() {
  return {
    port: 7890,
    'socks-port': 7891,
    'allow-lan': false,
    mode: 'Rule',
    'log-level': 'info',
    proxies: [],
    'rule-providers': {
      reject: {
        type: 'http',
        behavior: 'domain',
        url: 'https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/reject.txt',
        path: './ruleset/reject.yaml',
        interval: 86400
      },
      icloud: {
        type: 'http',
        behavior: 'domain',
        url: 'https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/icloud.txt',
        path: './ruleset/icloud.yaml',
        interval: 86400
      },
      apple: {
        type: 'http',
        behavior: 'domain',
        url: 'https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/apple.txt',
        path: './ruleset/apple.yaml',
        interval: 86400
      },
      proxy: {
        type: 'http',
        behavior: 'domain',
        url: 'https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/proxy.txt',
        path: './ruleset/proxy.yaml',
        interval: 86400
      },
      direct: {
        type: 'http',
        behavior: 'domain',
        url: 'https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/direct.txt',
        path: './ruleset/direct.yaml',
        interval: 86400
      },
      private: {
        type: 'http',
        behavior: 'domain',
        url: 'https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/private.txt',
        path: './ruleset/private.yaml',
        interval: 86400
      },
      gfw: {
        type: 'http',
        behavior: 'domain',
        url: 'https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/gfw.txt',
        path: './ruleset/gfw.yaml',
        interval: 86400
      },
      'tld-not-cn': {
        type: 'http',
        behavior: 'domain',
        url: 'https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/tld-not-cn.txt',
        path: './ruleset/tld-not-cn.yaml',
        interval: 86400
      },
      telegramcidr: {
        type: 'http',
        behavior: 'ipcidr',
        url: 'https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/telegramcidr.txt',
        path: './ruleset/telegramcidr.yaml',
        interval: 86400
      },
      cncidr: {
        type: 'http',
        behavior: 'ipcidr',
        url: 'https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/cncidr.txt',
        path: './ruleset/cncidr.yaml',
        interval: 86400
      },
      lancidr: {
        type: 'http',
        behavior: 'ipcidr',
        url: 'https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/lancidr.txt',
        path: './ruleset/lancidr.yaml',
        interval: 86400
      },
      applications: {
        type: 'http',
        behavior: 'classical',
        url: 'https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/applications.txt',
        path: './ruleset/applications.yaml',
        interval: 86400
      }
    },
    'proxy-groups': [
      {
        name: 'PROXY',
        type: 'select',
        proxies: ['hk233']
      }
    ],
    rules: [
      'RULE-SET,applications,DIRECT',
      'DOMAIN,clash.razord.top,DIRECT',
      'DOMAIN,yacd.haishan.me,DIRECT',
      'RULE-SET,private,DIRECT',
      'RULE-SET,reject,REJECT',
      'RULE-SET,icloud,DIRECT',
      'RULE-SET,apple,DIRECT',
      'RULE-SET,google,PROXY',
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

// Read proxies from input JSON file
function readProxiesFromFile(file) {
  try {
    const raw = fs.readFileSync(file, 'utf8');
    const data = JSON.parse(raw);
    if (Array.isArray(data)) return data;
    if (data.proxies && Array.isArray(data.proxies)) return data.proxies;
    console.error('Invalid JSON format: expected array or {proxies: []}');
    process.exit(2);
  } catch (e) {
    console.error('Failed to read input file:', e.message);
    process.exit(2);
  }
}

// Build proxies array from CLI or file
let proxies = [];
if (argv.input) {
  const infile = path.resolve(argv.input);
  proxies = readProxiesFromFile(infile);
} else if (argv.name && argv.server && argv.port && argv.password) {
  // single proxy from CLI
  proxies = [
    {
      name: argv.name,
      server: argv.server,
      port: argv.port,
      password: argv.password,
      sni: argv.sni || argv.server,
      network: argv.network || 'h2',
      host: argv.host || argv.sni || argv.server,
      path: argv.path || ('/' + argv.password)
    }
  ];
} else {
  // no input: print usage
  usage();
}

// Convert to Clash proxies using template
const clashProxies = proxies.map(p => {
  const tp = makeTrojanProxy(p);
  if (!tp) {
    console.error('Invalid proxy entry, missing required fields (name/server/port/password)');
    process.exit(3);
  }
  return tp;
});

// Build final clash object
const clash = makeBaseClash();
clash.proxies = clashProxies;

// Ensure proxy group contains all names
const group = clash['proxy-groups'][0];
group.proxies = clashProxies.map(x => x.name);

// Output
const outYaml = yaml.dump(clash, { lineWidth: -1 });
const outputFile = argv.output || 'config.yaml';
fs.writeFileSync(outputFile, outYaml, 'utf8');
console.log('Wrote YAML to', outputFile);
