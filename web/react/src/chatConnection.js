function createChatConnection(roomId) {
  let handler = () => {}
  let intervalId = null

  return {
    connect() {
      console.log(`Chat connection to ${roomId} opened.`)
      intervalId = setInterval(() => {
        handler(`Message from ${roomId} at ${new Date().toLocaleTimeString()}`)
      }, 3000)
    },

    disconnect() {
      clearInterval(intervalId)
      intervalId = null
      console.log(`Chat connection to ${roomId} closed.`)
    },

    onMessage(next) {
      handler = next
    }
  }
}

export { createChatConnection }
