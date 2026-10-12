import React from 'react'
import { createChatConnection } from './chatConnection'

class ChatRoom extends React.Component {
  state = {
    messages: []
  }

  connection = null

  componentDidMount() {
    this.subscribe(this.props.roomId)
  }

  componentDidUpdate(prevProps) {
    if (prevProps.roomId !== this.props.roomId) {
      this.unsubscribe()
      this.subscribe(this.props.roomId)
    }
  }

  componentWillUnmount() {
    this.unsubscribe()
  }

  subscribe(roomId) {
    const connection = createChatConnection(roomId)

    connection.connect()
    connection.onMessage((message) => {
      this.setState((prevState) => ({
        messages: [...prevState.messages, message]
      }))
    })

    this.connection = connection
  }

  unsubscribe() {
    this.connection?.disconnect()
    this.connection = null
  }

  render() {
    return (
      <section style={{marginBottom: 24}}>
        <h2>Class Component ChatRoom</h2>
        <p>Room: {this.props.roomId}</p>
        <ul>
          {this.state.messages.map((message, index) => (
            <li key={`${message}-${index}`}>{message}</li>
          ))}
        </ul>
      </section>
    )
  }
}

export default ChatRoom
