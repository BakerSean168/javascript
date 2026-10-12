import { useEffect, useMemo, useRef, useState } from 'react'
import { mockStreamAssistantReply } from './mockAiStream.mjs'
import './aiChatPage.css'

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function createMessage(role, content, overrides = {}) {
  return {
    id: createId(),
    role,
    content,
    createdAt: Date.now(),
    streamState: 'done',
    ...overrides
  }
}

function createGreetingMessage() {
  return createMessage(
    'assistant',
    [
      '你好，我是流式助手示例。',
      '输入问题后，我会模拟后端逐段返回内容。',
      '你可以随时停止生成，或点击重新生成重试。'
    ].join('\n')
  )
}

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  })
}

function roleLabel(role) {
  if (role === 'user') return 'You'
  return 'AI'
}

export default function AiChatPage() {
  const [messages, setMessages] = useState(() => [createGreetingMessage()])
  const [input, setInput] = useState('')
  const [chatState, setChatState] = useState('idle')
  const [errorText, setErrorText] = useState('')
  const [deltaCount, setDeltaCount] = useState(0)
  const [lastPrompt, setLastPrompt] = useState('')
  const [simulateError, setSimulateError] = useState(false)

  const abortRef = useRef(null)
  const bottomRef = useRef(null)

  const canSend = input.trim().length > 0 && chatState !== 'streaming'
  const canRetry = Boolean(lastPrompt) && chatState !== 'streaming'

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, chatState])

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  const statusText = useMemo(() => {
    if (chatState === 'streaming') {
      return `正在流式生成，已接收 ${deltaCount} 段增量`
    }

    if (chatState === 'error') {
      return `生成失败：${errorText || '未知错误'}`
    }

    if (errorText) {
      return errorText
    }

    return '准备就绪，输入问题后按 Enter 发送'
  }, [chatState, deltaCount, errorText])

  async function streamReply(prompt, options = {}) {
    const { appendUser = true } = options
    const cleanPrompt = prompt.trim()

    if (!cleanPrompt || abortRef.current) {
      return
    }

    if (appendUser) {
      setMessages((prev) => [...prev, createMessage('user', cleanPrompt)])
    }

    const assistantMessageId = createId()

    setMessages((prev) => [
      ...prev,
      createMessage('assistant', '', {
        id: assistantMessageId,
        streamState: 'streaming'
      })
    ])

    setLastPrompt(cleanPrompt)
    setErrorText('')
    setDeltaCount(0)
    setChatState('streaming')

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const failAtChunk = simulateError ? 10 : -1

      for await (const chunk of mockStreamAssistantReply({
        prompt: cleanPrompt,
        signal: controller.signal,
        failAtChunk
      })) {
        if (chunk.type === 'delta') {
          setDeltaCount(chunk.index + 1)

          setMessages((prev) =>
            prev.map((message) => {
              if (message.id !== assistantMessageId) {
                return message
              }

              return {
                ...message,
                content: message.content + chunk.delta
              }
            })
          )
        }

        if (chunk.type === 'done') {
          setMessages((prev) =>
            prev.map((message) => {
              if (message.id !== assistantMessageId) {
                return message
              }

              return {
                ...message,
                streamState: 'done'
              }
            })
          )
        }
      }

      setChatState('idle')
    } catch (error) {
      const isAbort = error?.name === 'AbortError'

      setMessages((prev) =>
        prev.map((message) => {
          if (message.id !== assistantMessageId) {
            return message
          }

          return {
            ...message,
            streamState: isAbort ? 'stopped' : 'error',
            error: isAbort ? '' : error?.message || '流式请求异常'
          }
        })
      )

      if (isAbort) {
        setErrorText('生成已停止，你可以点击重新生成继续尝试。')
        setChatState('idle')
      } else {
        setErrorText(error?.message || '流式请求失败')
        setChatState('error')
      }
    } finally {
      abortRef.current = null
    }
  }

  async function handleSend() {
    const prompt = input

    if (!prompt.trim() || chatState === 'streaming') {
      return
    }

    setInput('')
    await streamReply(prompt, { appendUser: true })
  }

  function handleStop() {
    abortRef.current?.abort()
  }

  async function handleRetry() {
    if (!lastPrompt || chatState === 'streaming') {
      return
    }

    await streamReply(lastPrompt, { appendUser: false })
  }

  function handleClear() {
    if (chatState === 'streaming') {
      return
    }

    setMessages([createGreetingMessage()])
    setInput('')
    setErrorText('')
    setDeltaCount(0)
    setLastPrompt('')
    setChatState('idle')
  }

  function handleInputKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()

      if (canSend) {
        handleSend()
      }
    }
  }

  return (
    <main className="ai-page">
      <section className="ai-shell">
        <header className="ai-header">
          <div>
            <p className="ai-eyebrow">React Streaming Playground</p>
            <h1>AI Chat With Mock Stream</h1>
            <p className="ai-subtitle">前端持续接收增量文本，并实时更新同一条 AI 消息。</p>
          </div>

          <div className="ai-header-controls">
            <label className="ai-switch">
              <input
                type="checkbox"
                checked={simulateError}
                onChange={(event) => setSimulateError(event.target.checked)}
                disabled={chatState === 'streaming'}
              />
              <span>模拟异常</span>
            </label>

            <button
              type="button"
              className="ai-btn ai-btn-ghost"
              onClick={handleClear}
              disabled={chatState === 'streaming'}
            >
              清空会话
            </button>
          </div>
        </header>

        <section className="ai-stream-panel" aria-live="polite">
          {messages.map((message, index) => (
            <article
              key={message.id}
              className={`ai-message ai-message-${message.role}`}
              style={{ '--msg-index': index }}
            >
              <header className="ai-message-meta">
                <span className="ai-role">{roleLabel(message.role)}</span>
                <time>{formatTime(message.createdAt)}</time>
              </header>

              <div className="ai-message-body">
                {message.content || (message.streamState === 'streaming' ? '正在思考...' : '')}
                {message.streamState === 'streaming' ? <span className="ai-caret">▍</span> : null}
              </div>

              {message.streamState === 'error' ? (
                <p className="ai-message-note ai-message-note-error">
                  本条消息生成失败：{message.error || '未知错误'}
                </p>
              ) : null}

              {message.streamState === 'stopped' ? (
                <p className="ai-message-note ai-message-note-stop">本条消息已被手动停止。</p>
              ) : null}
            </article>
          ))}
          <div ref={bottomRef} />
        </section>

        <footer className="ai-composer">
          <div className="ai-status-line">
            <span
              className={`ai-status-dot ${
                chatState === 'streaming'
                  ? 'ai-status-dot-streaming'
                  : chatState === 'error'
                  ? 'ai-status-dot-error'
                  : 'ai-status-dot-idle'
              }`}
            />
            <span>{statusText}</span>
          </div>

          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="输入你的问题，按 Enter 发送，Shift + Enter 换行"
            rows={3}
            disabled={chatState === 'streaming'}
          />

          <div className="ai-actions">
            <button type="button" className="ai-btn ai-btn-send" onClick={handleSend} disabled={!canSend}>
              发送
            </button>

            <button
              type="button"
              className="ai-btn ai-btn-stop"
              onClick={handleStop}
              disabled={chatState !== 'streaming'}
            >
              停止生成
            </button>

            <button type="button" className="ai-btn ai-btn-retry" onClick={handleRetry} disabled={!canRetry}>
              重新生成
            </button>
          </div>
        </footer>
      </section>
    </main>
  )
}