const http = require('http');
const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public');
const port = 30001;

const server = http.createServer((req, res) => {
  if (req.url === '/stream-pdf') {
    const filePath = path.join(publicDir, 'test.pdf');
    if (!fs.existsSync(filePath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('test.pdf not found in public/');
      return;
    }

    const stat = fs.statSync(filePath);
    res.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Content-Length': stat.size,
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*',
    });
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  if (req.url === '/stream-test') {
    res.writeHead(200, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*',
    });

    let count = 0;
    const max = 100;
    const interval = setInterval(() => {
      if (count >= max) {
        clearInterval(interval);
        res.end('STREAM END\n');
        return;
      }
      res.write(`chunk ${count}\n`);
      count += 1;
    }, 50);
    return;
  }

  if (req.url === '/sse' || req.url === '/sse-endpoint') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });
    res.write('retry: 3000\n\n');

    let count = 0;
    const interval = setInterval(() => {
      if (res.writableEnded) {
        clearInterval(interval);
        return;
      }
      res.write(`id: ${count}\n`);
      res.write(`event: message\n`);
      res.write(`data: ${new Date().toISOString()} - message ${count}\n\n`);
      count += 1;
      if (count >= 20) {
        res.write('event: end\ndata: done\n\n');
        clearInterval(interval);
        res.end();
      }
    }, 1000);

    req.on('close', () => {
      clearInterval(interval);
    });
    return;
  }

  if (req.url === '/status') {
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(JSON.stringify({ status: 'ok', time: new Date().toISOString() }));
    return;
  }

  res.writeHead(404, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
  });
  res.end('Not found');
});

server.listen(port, () => {
  console.log(`Local backend running: http://localhost:${port}`);
  console.log('  GET /stream-pdf      -> stream public/test.pdf');
  console.log('  GET /stream-test     -> chunked text stream');
  console.log('  GET /sse            -> SSE event stream');
  console.log('  GET /sse-endpoint   -> SSE event stream alias');
  console.log('  GET /status          -> simple JSON status');
});
