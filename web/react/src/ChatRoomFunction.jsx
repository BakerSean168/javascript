import { useEffect, useState } from 'react'
import { createChatConnection } from './chatConnection'

function ChatRoom({ roomId }) {
  const [messages, setMessages] = useState([])

  useEffect(() => {
    const connection = createChatConnection(roomId)

    connection.connect()
    connection.onMessage((message) => {
      setMessages((prevMessages) => [...prevMessages, message])
    })

    return () => {
      connection.disconnect()
    }
  }, [roomId])

  return (
    <section>
      <h2>Function Component ChatRoom</h2>
      <p>Room: {roomId}</p>
      <ul>
        {messages.map((message, index) => (
          <li key={`${message}-${index}`}>{message}</li>
        ))}
      </ul>
    </section>
  )
}

export default ChatRoom
