import ChatRoomClass from './ChatRoomClass'
import ChatRoomFunction from './ChatRoomFunction'
import AiChatPage from './AiChatPage'
import FetchPage from './FetchPage';
import SsePage from './SsePage';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';

function Home() {
  return (
    <div>
      <h1>首页</h1>
      <p>这是首页内容区域。你可以在左侧菜单中选择不同页面。</p>
    </div>
  );
}

function About() {
  return (
    <div>
      <h1>About</h1>
      <p>This is the About page.</p>
    </div>
  );
}

export default function App(){
  return (
    <BrowserRouter>
      <div className="app-shell">
        <nav className="sidebar">
          <h2>菜单</h2>
          <NavLink end to="/" className={({ isActive }) => isActive ? 'active' : ''}>
            首页
          </NavLink>
          <NavLink to="/about" className={({ isActive }) => isActive ? 'active' : ''}>
            About
          </NavLink>
          <NavLink to="/chat-class" className={({ isActive }) => isActive ? 'active' : ''}>
            ChatRoomClass
          </NavLink>
          <NavLink to="/chat-function" className={({ isActive }) => isActive ? 'active' : ''}>
            ChatRoomFunction
          </NavLink>
          <NavLink to="/ai-chat" className={({ isActive }) => isActive ? 'active' : ''}>
            AiChatPage
          </NavLink>
          <NavLink to="/fetch-page" className={({ isActive }) => isActive ? 'active' : ''}>
            Fetch Page
          </NavLink>
          <NavLink to="/sse-page" className={({ isActive }) => isActive ? 'active' : ''}>
            SSE Page
          </NavLink>
        </nav>

        <main className="content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/chat-class" element={<ChatRoomClass />} />
            <Route path="/chat-function" element={<ChatRoomFunction />} />
            <Route path="/ai-chat" element={<AiChatPage />} />
            <Route path="/fetch-page" element={<FetchPage />} />
            <Route path="/sse-page" element={<SsePage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
