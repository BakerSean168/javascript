const SAMPLE_INTRO = [
  '这是一个模拟流式响应。',
  '前端会在同一条 assistant 消息上不断追加增量文本。',
  '你可以随时停止生成，并保留已收到的内容。'
]

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function chunkText(text, minChunkSize = 1, maxChunkSize = 4) {
  const chunks = []
  let index = 0

  while (index < text.length) {
    const size = randomInt(minChunkSize, maxChunkSize)
    chunks.push(text.slice(index, index + size))
    index += size
  }

  return chunks
}

function createReplyFromPrompt(prompt) {
  const safePrompt = prompt.trim() || '你好'

  return [
    ...SAMPLE_INTRO,
    '',
    `你的问题是：${safePrompt}`,
    '',
    '建议你先实现 4 个状态：idle、streaming、done、error。',
    '再实现 3 个动作：发送、停止、重试。',
    '最后处理 2 类异常：网络中断和用户主动取消。'
  ].join('\n')
}

/**
 * 模拟后端流式传输：每次 yield 一段 delta 文本。
 */
export async function* mockStreamAssistantReply({
  prompt,
  signal,
  minDelay = 30,
  maxDelay = 110,
  minChunkSize = 1,
  maxChunkSize = 5,
  failAtChunk = -1
} = {}) {
  const fullText = createReplyFromPrompt(prompt || '')
  const chunks = chunkText(fullText, minChunkSize, maxChunkSize)

  for (let i = 0; i < chunks.length; i += 1) {
    if (signal?.aborted) {
      throw new DOMException('Stream aborted by user', 'AbortError')
    }

    await sleep(randomInt(minDelay, maxDelay))

    if (signal?.aborted) {
      throw new DOMException('Stream aborted by user', 'AbortError')
    }

    if (failAtChunk === i) {
      throw new Error('Mock network error during streaming')
    }

    yield {
      type: 'delta',
      index: i,
      delta: chunks[i]
    }
  }

  yield {
    type: 'done',
    finishReason: 'stop'
  }
}