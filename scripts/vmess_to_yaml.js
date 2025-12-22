const fs = require('fs');
const yaml = require('js-yaml');
const { Buffer } = require('buffer');

if (process.argv.length < 3) {
    console.error('请提供 VMess 链接作为参数');
    process.exit(1);
}

const vmessLink = process.argv[2];

try {
    // 解析 VMess 链接
    const base64Str = vmessLink.replace("vmess://", "");
    const decodedStr = Buffer.from(base64Str, 'base64').toString('utf8');
    const vmessConfig = JSON.parse(decodedStr);

    // 读取模板文件
    const templateContent = fs.readFileSync('./asserts/template.yaml', 'utf8');
    const yamlObject = yaml.load(templateContent);

    const proxy = yamlObject.proxies[0];

    // 通用字段
    proxy.name = vmessConfig.ps;
    proxy.type = "vmess";
    proxy.server = vmessConfig.add;
    proxy.port = Number(vmessConfig.port);
    proxy.uuid = vmessConfig.id;

    // alterId 在 ClashMeta 必须为 0
    proxy.alterId = 0;
    
    // cipher
    proxy.cipher = vmessConfig.scy || "auto";

    // TLS
    const enableTLS = vmessConfig.tls === "tls" || vmessConfig.tls === "h2" || vmessConfig.tls === "ws";
    proxy.tls = enableTLS;
    proxy["skip-cert-verify"] = false;

    // ServerName (SNI)
    proxy.servername = vmessConfig.host || vmessConfig.add;

    // 处理不同协议 network
    const net = vmessConfig.net;

    if (net === "tcp") {
        proxy.network = "tcp";
    }

    // WS
    if (net === "ws") {
        proxy.network = "ws";
        proxy["ws-opts"] = {
            path: vmessConfig.path || "/",
            headers: {
                Host: vmessConfig.host || vmessConfig.add
            }
        };
    }

    // H2
    if (net === "h2") {
        proxy.network = "h2";
        proxy.alpn = ["h2"];
        proxy["h2-opts"] = {
            host: [vmessConfig.host || vmessConfig.add],
            path: vmessConfig.path || "/"
        };
    }

    // 将代理加入代理组
    yamlObject["proxy-groups"][0].proxies = [proxy.name];

    // 输出文件
    const timestamp = new Date().toISOString()
        .replace(/T/, '_')
        .replace(/:/g, '')
        .split('.')[0];

    const outputFilename = `from_vmess_${timestamp}.yaml`;
    const yamlStr = yaml.dump(yamlObject, { forceQuotes: true });

    fs.writeFileSync(outputFilename, yamlStr, 'utf8');
    console.log(`✅ 成功生成配置：${outputFilename}`);
} catch (error) {
    console.error("❌ 错误：", error.message);
}
