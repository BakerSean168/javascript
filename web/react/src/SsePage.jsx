import { useEffect, useRef, useState } from 'react';

const SSE_URL = 'http://localhost:30001/sse';

function parseSSEChunk(chunk, buffer) {
  const text = buffer + chunk;
  const events = [];
  let start = 0;
  let index = text.indexOf('\n\n', start);

  while (index !== -1) {
    const block = text.slice(start, index).trim();
    if (block) {
      const event = { type: 'message', data: '' };
      block.split('\n').forEach((line) => {
        if (line.startsWith('event:')) {
          event.type = line.slice(6).trim();
        } else if (line.startsWith('data:')) {
          event.data += line.slice(5).trim() + '\n';
        }
      });
      event.data = event.data.replace(/\n$/, '');
      events.push(event);
    }
    start = index + 2;
    index = text.indexOf('\n\n', start);
  }

  return {
    events,
    buffer: text.slice(start),
  };
}

export default function SsePage() {
  const [nativeStatus, setNativeStatus] = useState('未连接');
  const [nativeMessages, setNativeMessages] = useState([]);
  const [fetchStatus, setFetchStatus] = useState('未连接');
  const [fetchMessages, setFetchMessages] = useState([]);
  const [fetchError, setFetchError] = useState(null);
  const nativeSourceRef = useRef(null);
  const fetchAbortRef = useRef(null);

  useEffect(() => {
    return () => {
      if (nativeSourceRef.current) {
        nativeSourceRef.current.close();
      }
      if (fetchAbortRef.current) {
        fetchAbortRef.current.abort();
      }
    };
  }, []);

  function connectNativeSSE() {
    if (nativeSourceRef.current) {
      nativeSourceRef.current.close();
    }
    setNativeStatus('连接中...');
    setNativeMessages([]);

    const source = new EventSource(SSE_URL);
    nativeSourceRef.current = source;

    source.onopen = () => {
      setNativeStatus('已连接');
    };

    source.onmessage = (event) => {
      setNativeMessages((prev) => [...prev, event.data]);
    };

    source.onerror = () => {
      setNativeStatus('连接错误');
      source.close();
    };
  }

  function disconnectNativeSSE() {
    if (nativeSourceRef.current) {
      nativeSourceRef.current.close();
      nativeSourceRef.current = null;
      setNativeStatus('已断开');
    }
  }

  async function connectFetchSSE() {
    if (fetchAbortRef.current) {
      fetchAbortRef.current.abort();
    }
    setFetchStatus('连接中...');
    setFetchMessages([]);
    setFetchError(null);
    const controller = new AbortController();
    fetchAbortRef.current = controller;

    try {
      const response = await fetch(SSE_URL, { signal: controller.signal });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      if (!response.body) {
        throw new Error('ReadableStream not supported');
      }

      setFetchStatus('已连接');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          setFetchStatus('已完成');
          break;
        }
        buffer += decoder.decode(value, { stream: true });
        const parsed = parseSSEChunk(buffer, '');
        buffer = parsed.buffer;
        parsed.events.forEach((event) => {
          if (event.type === 'message') {
            setFetchMessages((prev) => [...prev, event.data]);
          }
        });
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        setFetchStatus('已中止');
      } else {
        setFetchStatus('错误');
        setFetchError(error.message);
      }
    }
  }

  function abortFetchSSE() {
    if (fetchAbortRef.current) {
      fetchAbortRef.current.abort();
      fetchAbortRef.current = null;
      setFetchStatus('已中止');
    }
  }

  return (
    <div>
      <h1>SSE 对比学习页</h1>
      <section>
        <h2>1. 浏览器原生 EventSource</h2>
        <p>它自动建立 SSE 连接、解析事件，并在断开时重连。</p>
        <div className="button-group">
          <button onClick={connectNativeSSE}>Connect EventSource</button>
          <button onClick={disconnectNativeSSE}>Close EventSource</button>
        </div>
        <div>状态：{nativeStatus}</div>
        <h3>收到消息</h3>
        <ul>
          {nativeMessages.map((msg, index) => (
            <li key={index}>{msg}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2>2. fetch + 解析 SSE 文本</h2>
        <p>它可以发普通 HTTP 请求，自己读取流、解析事件格式，适合需要自定义请求的场景。</p>
        <div className="button-group">
          <button onClick={connectFetchSSE}>Connect fetch SSE</button>
          <button onClick={abortFetchSSE}>Abort fetch SSE</button>
        </div>
        <div>状态：{fetchStatus}</div>
        {fetchError && <div style={{ color: 'red' }}>错误：{fetchError}</div>}
        <h3>收到消息</h3>
        <ul>
          {fetchMessages.map((msg, index) => (
            <li key={index}>{msg}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2>对比说明</h2>
        <ul>
          <li>`EventSource`：简单、自动重连，适合标准 SSE GET 场景。</li>
          <li>`fetch + parseSSE`：适合需要 POST、认证、取消或自己控制流解析的场景。</li>
          <li>后端实现上，两者都需要返回 `Content-Type: text/event-stream`，并保持连接不断开。</li>
        </ul>
      </section>
    </div>
  );
}
