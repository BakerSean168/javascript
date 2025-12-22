const net = require('net');

/**
 * 检查一个特定的 TCP 端口是否可用。
 * @param {number} port 要检查的端口号。
 * @returns {Promise<boolean>} 如果端口可用返回 true，否则返回 false。
 */
function checkPortAvailability(port) {
    return new Promise((resolve) => {
        // 创建一个服务器实例
        const server = net.createServer();

        // 监听成功：端口可用
        server.once('listening', () => {
            // 关闭服务器并返回 true
            server.close(() => {
                resolve(true);
            });
        });

        // 监听错误：端口可能被占用
        server.once('error', (err) => {
            // EADDRINUSE 是端口被占用的标准错误码
            if (err.code === 'EADDRINUSE') {
                resolve(false);
            } else {
                // 其他错误（如 EACCES 权限不足），也视为不可用
                console.error(`端口 ${port} 发生意外错误: ${err.message}`);
                resolve(false);
            }
        });

        // 尝试让服务器监听该端口
        server.listen(port);
    });
}

/**
 * 检测一个范围内的端口，并列出不可用的端口。
 * @param {number} startPort 起始端口。
 * @param {number} endPort 结束端口。
 */
async function scanPorts(startPort, endPort) {
    console.log(`🚀 开始扫描端口范围: ${startPort} 到 ${endPort}...`);

    const unavailablePorts = [];

    for (let port = startPort; port <= endPort; port++) {
        // 使用 Promise.allSettled 来并行检查，加快扫描速度
        // 但是对于大量端口，通常建议串行或小批量并行，避免资源耗尽。
        // 这里采用串行检查，确保稳定性和清晰的输出。
        
        const isAvailable = await checkPortAvailability(port);

        if (!isAvailable) {
            unavailablePorts.push(port);
            // 立即打印，让你看到进度和问题端口
            console.log(`❌ 端口 ${port} 不可用 (被占用或受限)。`);
        } else {
            // 可以选择打印可用端口，或者静默处理，只列出不可用的
            // console.log(`✅ 端口 ${port} 可用。`); 
        }
    }

    console.log(`\n--- 扫描结果摘要 ---`);
    if (unavailablePorts.length === 0) {
        console.log(`🎉 扫描的 ${startPort} 到 ${endPort} 范围内的所有端口都可用。`);
    } else {
        console.log(`🚨 发现不可用端口 (共 ${unavailablePorts.length} 个):`);
        // 对不可用端口进行分类显示
        const unavailableGroups = groupPorts(unavailablePorts);
        unavailableGroups.forEach(group => console.log(`  - ${group}`));
        
        console.log(`\n💡 **重要提示:** 您的 Java 程序中 40000 往上的端口报占用，很可能就是这些端口中的某一个或某一段被操作系统、其他软件或安全软件永久性地预留或占用了。`);
    }
}

/**
 * 将连续的端口号进行分组显示 (例如：[8000, 8001, 8002] -> "8000-8002")
 * @param {number[]} ports 端口号数组。
 * @returns {string[]} 分组后的字符串数组。
 */
function groupPorts(ports) {
    if (ports.length === 0) return [];
    
    const groups = [];
    let start = ports[0];
    let end = ports[0];
    
    for (let i = 1; i < ports.length; i++) {
        if (ports[i] === end + 1) {
            end = ports[i];
        } else {
            if (start === end) {
                groups.push(start.toString());
            } else {
                groups.push(`${start}-${end}`);
            }
            start = ports[i];
            end = ports[i];
        }
    }
    
    if (start === end) {
        groups.push(start.toString());
    } else {
        groups.push(`${start}-${end}`);
    }
    
    return groups;
}

// ----------------------------------------------------
// !!! 在这里设置你想要扫描的端口范围 !!!
// 根据你的描述，我们扫描 40000 附近的端口
// 注意: 扫描大量端口会很耗时。
const START_PORT = 40080; // 你觉得开始出现问题的端口附近
const END_PORT = 40100; // 检查 21 个端口
// ----------------------------------------------------

// 执行扫描
scanPorts(START_PORT, END_PORT).catch(err => {
    console.error('脚本执行过程中出现未捕获的错误:', err);
});