const fs = require('fs');
const path = require('path');

// 目标文件大小：100MB（100 * 1024 * 1024 字节）
const TARGET_SIZE = 100 * 1024 * 1024;
// 每次写入的块大小（64KB，可根据需求调整）
const CHUNK_SIZE = 64 * 1024;
// 输出文件路径（当前目录下的 test_100mb.pdf）
const OUTPUT_PATH = path.join(__dirname, 'test_100mb.pdf');

function generateLargePdf() {
    // 创建可写流
    const writeStream = fs.createWriteStream(OUTPUT_PATH);
    
    let writtenBytes = 0;
    
    // 写入 PDF 文件头（避免部分工具识别为无效文件）
    writeStream.write(Buffer.from('%PDF-1.7\n', 'utf8'));
    writtenBytes += Buffer.byteLength('%PDF-1.7\n');
    
    // 循环写入随机数据直到达到目标大小
    function writeChunk() {
        // 计算剩余需要写入的字节数
        const remaining = TARGET_SIZE - writtenBytes;
        if (remaining <= 0) {
            // 写入 PDF 文件尾
            writeStream.write(Buffer.from('%%EOF\n', 'utf8'));
            writeStream.end();
            console.log(`✅ 100MB PDF 文件已生成：${OUTPUT_PATH}`);
            return;
        }
        
        // 确定当前块的实际大小（不超过剩余字节）
        const currentChunkSize = Math.min(CHUNK_SIZE, remaining);
        // 生成随机二进制数据
        const chunk = Buffer.allocUnsafe(currentChunkSize);
        for (let i = 0; i < currentChunkSize; i++) {
            chunk[i] = Math.floor(Math.random() * 256);
        }
        
        // 写入当前块
        const canContinue = writeStream.write(chunk);
        writtenBytes += currentChunkSize;
        
        // 显示进度（每写入10%打印一次）
        const progress = Math.floor((writtenBytes / TARGET_SIZE) * 100);
        if (progress % 10 === 0) {
            console.log(`进度：${progress}%`);
        }
        
        // 如果流缓冲区未满，继续写入；否则等待 drain 事件
        if (canContinue) {
            setImmediate(writeChunk);
        } else {
            writeStream.once('drain', writeChunk);
        }
    }
    
    // 开始写入
    writeChunk();
    
    // 错误处理
    writeStream.on('error', (err) => {
        console.error('❌ 生成文件失败：', err.message);
    });
}

// 执行生成函数
generateLargePdf();