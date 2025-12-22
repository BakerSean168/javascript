#!/usr/bin/env node
/*
VLESS -> Clash.Meta YAML generator (Node.js)

This script:
- Accepts a JSON file with VLESS proxy entries or single-proxy CLI args
- Builds a Clash.Meta-compatible YAML config
- Writes the YAML directly to the output file (required)

Dependencies:
  npm install js-yaml minimist

Usage examples:
  node vless-clash-generator.js --input vless_proxies.json --output clash.yaml
  node vless-clash-generator.js --name hk233 --server example.com --port 443 --uuid <uuid> --network h2 --host example.com --path /<uuid> --output clash.yaml

JSON proxy object example (array):
[
  {
    "name": "hk233",
    "server": "example.com",
    "port": 443,
    "uuid": "9232aa42-00e0-4a0a-aa86-b412503d32fb",
    "flow": "xtls-rprx-vision",
    "sni": "example.com",
    "network": "h2",
    "host": "example.com",
    "path": "/9232aa42-00e0-4a0a-aa86-b412503d32fb"
  }
]
*/

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const argv = require('minimist')(process.argv.slice(2));

function usage() {
    console.log('\nVLESS -> Clash.Meta YAML generator');
    console.log('Usage: node vless-clash-generator.js [input_file] [output_file]');
    console.log('   or: node vless-clash-generator.js --name --server --port --uuid --network --host --path --output');
    console.log('\nOptions:');
    console.log('  input_file   VLESS URL file (default: asserts/1.txt)');
    console.log('  output_file  YAML output file (default: config.yaml)');
    console.log('  --input      JSON file containing array of VLESS proxy objects');
    console.log('  --output     YAML output file');
    console.log('  --help       Show this help');
    process.exit(0);
}

if (argv.help) usage();

function parseVlessUrl(url) {
    try {
        // Remove 'vless://' prefix
        const urlWithoutProtocol = url.replace('vless://', '');

        // Split by '#' for name
        const [mainPart, name] = urlWithoutProtocol.split('#');

        // Split by '?' for params
        const [credentials, paramsStr] = mainPart.split('?');

        // Parse credentials: uuid@server:port
        const [uuid, serverPort] = credentials.split('@');
        const [server, port] = serverPort.split(':');

        // Parse query parameters
        const params = new URLSearchParams(paramsStr);

        return {
            name: name || `vless-${server}-${port}`,
            server: server,
            port: parseInt(port),
            uuid: uuid,
            flow: params.get('flow') || undefined,
            sni: params.get('sni') || undefined,
            network: params.get('type') || 'tcp',
            host: params.get('host') || undefined,
            path: params.get('path') || undefined,
            pbk: params.get('pbk') || undefined,
            fp: params.get('fp') || undefined,
            security: params.get('security') || 'tls'
        };
    } catch (e) {
        console.error('Failed to parse VLESS URL:', e.message);
        return null;
    }
}

function readVlessUrlsFromFile(file) {
    try {
        const raw = fs.readFileSync(file, 'utf8');
        const lines = raw.trim().split('\n').filter(line => line.trim());
        const proxies = [];

        for (const line of lines) {
            if (line.startsWith('vless://')) {
                const proxy = parseVlessUrl(line.trim());
                if (proxy) {
                    proxies.push(proxy);
                }
            }
        }

        return proxies;
    } catch (e) {
        console.error('Failed to read VLESS file:', e.message);
        process.exit(2);
    }
}

function readProxiesFromFile(file) {
    try {
        const raw = fs.readFileSync(file, 'utf8');
        const data = JSON.parse(raw);
        if (Array.isArray(data)) return data;
        if (data.proxies && Array.isArray(data.proxies)) return data.proxies;
        throw new Error('Invalid JSON format: expected array or {proxies: []}');
    } catch (e) {
        console.error('Failed to read input file:', e.message);
        process.exit(2);
    }
}

function makeVlessProxy(p) {
    if (!p || !p.name || !p.server || !p.port || !p.uuid) return null;
    const network = (p.network || 'tcp').toLowerCase();
    const host = p.host || p.sni || p.server;
    const pathVal = p.path || ('/' + p.uuid);

    const proxy = {
        name: p.name,
        type: 'vless',
        server: p.server,
        port: Number(p.port),
        uuid: p.uuid,
        flow: p.flow || undefined, // optional
        udp: p.udp === undefined ? true : !!p.udp,
        'skip-cert-verify': p['skip-cert-verify'] === undefined ? false : !!p['skip-cert-verify'],
        sni: p.sni || host || undefined,
        network: network,
        alpn: p.alpn || ['h2', 'http/1.1']
    };

    // Handle security type
    if (p.security === 'reality') {
        proxy['client-fingerprint'] = p.fp || 'chrome';
        proxy['reality-opts'] = {
            'public-key': p.pbk,
            'short-id': p.sid || ''
        };
    } else {
        proxy.tls = p.tls === undefined ? true : !!p.tls;
    }

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
    if (network === 'grpc') {
        proxy['grpc-opts'] = {
            'grpc-service-name': p['grpc-service-name'] || ''
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

// Build proxies list
let proxies = [];
const inputFile = argv.input || argv._[0] || 'asserts/1.txt';
const outputFile = argv.output || argv._[1] || 'config.yaml';

if (argv.input) {
    // JSON input
    const infile = path.resolve(argv.input);
    proxies = readProxiesFromFile(infile);
} else if (argv.name && argv.server && argv.port && argv.uuid) {
    // Single proxy from CLI args
    proxies = [
        {
            name: argv.name,
            server: argv.server,
            port: argv.port,
            uuid: argv.uuid,
            flow: argv.flow,
            sni: argv.sni || argv.server,
            network: argv.network || 'tcp',
            host: argv.host || argv.sni || argv.server,
            path: argv.path || ('/' + argv.uuid)
        }
    ];
} else {
    // Default: read VLESS URLs from file
    const infile = path.resolve(inputFile);
    proxies = readVlessUrlsFromFile(infile);

    if (proxies.length === 0) {
        console.error('No valid VLESS URLs found in', infile);
        process.exit(1);
    }
}

// Convert and validate
const clashProxies = proxies.map(p => {
    const vp = makeVlessProxy(p);
    if (!vp) {
        console.error('Invalid proxy entry, missing required fields (name/server/port/uuid)');
        process.exit(3);
    }
    return vp;
});

const clash = makeBaseClash();
clash.proxies = clashProxies;
clash['proxy-groups'][0].proxies = clashProxies.map(x => x.name);

// Dump to YAML and write to output file
const outYaml = yaml.dump(clash, { lineWidth: -1 });
try {
    fs.writeFileSync(path.resolve(outputFile), outYaml, 'utf8');
    console.log('Wrote Clash YAML to', path.resolve(outputFile));
} catch (e) {
    console.error('Failed to write output file:', e.message);
    process.exit(4);
}
