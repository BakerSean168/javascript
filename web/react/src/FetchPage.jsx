import { useState, useRef } from 'react';
export default function FetchPage() {
    // 这里是 FetchPage 组件的内容，你可以在这里实现你的 fetch 逻辑
    // 用来学习 fetch 的api 还有 流式处理相关接口。
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const controllerRef = useRef(null);
    function handleFetch() {
        setLoading(true);
        setError(null);
        setData(null);

        controllerRef.current = new AbortController();
        const signal = controllerRef.current.signal;

        // 同源请求本网站内容，使用相对路径或带协议的完整 URL
        fetch('http://localhost:30001/stream-test', { signal })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                // console.log(response);
                // console.log('Response status:', response.status);
                // console.log('Response headers:', response.headers.get('content-type'));

                // const contentType = response.headers.get('content-type') || '';
                // if (contentType.includes('application/json')) {
                //     return response.json();
                // }
                // return response.text();
                return response.body
            })
            .then(rb => {
                const reader = rb.getReader();
                // Process the streamed data
                // ...
                setLoading(false);
                return reader;
            })
            .then(reader => {
                // 处理流式数据
                let result = '';
                let chunkCount = 0;
                const decoder = new TextDecoder();
                function readChunk() {
                    reader.read().then(({ done, value}) => {
                        if (done) {
                            console.log('Stream complete');

                            setLoading(false);
                            return;
                        }
                        result += decoder.decode(value, { stream: true });
                        chunkCount++;
                        setData(result);
                        readChunk();
                    })
                }
                readChunk();

            })
            .catch(error => {
                console.error(error);
                if (error.name === 'AbortError') {
                    setError('Fetch aborted');
                } else {
                    setError(error.message);
                }
                setLoading(false);
            });
    }

    function handleAbort() {
        console.log('Aborting fetch request');
        if (controllerRef.current) {
            controllerRef.current.abort();
            controllerRef.current = null;
        }
    }
    return (
        <div>
            <h1>Fetch Page</h1>
            <p>This is the Fetch Page. You can implement your fetch logic here.</p>
                {/* 这里可以添加按钮来触发 fetch 请求，并显示数据、加载状态和错误信息 */}
                <div className='button-group'>
                    <button onClick={handleFetch}>Fetch Data</button>
                    <button onClick={handleAbort}>Abort</button>
                </div>

                {loading && <p>Loading...</p>}
                {error && <p>Error: {error}</p>}
                {data && (
                    <pre>{typeof data === 'string' ? data : JSON.stringify(data, null, 2)}</pre>
                )}
        </div>
    )

}