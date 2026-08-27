import { useEffect, useMemo, useState } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import CodeEditor from './components/CodeEditor.jsx';
import UserList from './components/UserList.jsx';
import ReviewPanel from './components/ReviewPanel.jsx';
import './styles.css';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:4000';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const USER_COLORS = ['#f2b134', '#4cc9f0', '#f77f9b', '#7bd389', '#c77dff', '#ff9f6b'];
const ADJECTIVES = ['Swift', 'Quiet', 'Bold', 'Clever', 'Bright', 'Calm', 'Sharp'];
const ANIMALS = ['Falcon', 'Otter', 'Fox', 'Panda', 'Wolf', 'Hawk', 'Lynx'];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomName = () => `${pick(ADJECTIVES)}${pick(ANIMALS)}`;
const randomColor = () => pick(USER_COLORS);

export default function App() {
  const [joined, setJoined] = useState(false);
  const [room, setRoom] = useState('demo-room');
  const [name] = useState(randomName);
  const [color] = useState(randomColor);
  const [language, setLanguage] = useState('javascript');
  const [users, setUsers] = useState([]);
  const [provider, setProvider] = useState(null);
  const [review, setReview] = useState(null);
  const [reviewing, setReviewing] = useState(false);

  const ydoc = useMemo(() => new Y.Doc(), [joined]);
  const ytext = useMemo(() => ydoc.getText('codemirror'), [ydoc]);

  useEffect(() => {
    if (!joined) return undefined;

    const p = new WebsocketProvider(WS_URL, room, ydoc);
    p.awareness.setLocalStateField('user', { name, color });

    const updateUsers = () => {
      const states = Array.from(p.awareness.getStates().values());
      setUsers(states.map((s) => s.user).filter(Boolean));
    };

    p.awareness.on('change', updateUsers);
    updateUsers();
    setProvider(p);

    return () => {
      p.awareness.off('change', updateUsers);
      p.destroy();
      setProvider(null);
    };
  }, [joined, room, ydoc, name, color]);

  async function handleReview() {
    setReviewing(true);
    setReview(null);
    try {
      const res = await fetch(`${API_URL}/api/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: ytext.toString(), language }),
      });
      const data = await res.json();
      setReview(res.ok ? data : { summary: data.error || 'Review failed.', issues: [], suggestions: [] });
    } catch {
      setReview({ summary: 'Could not reach the review service. Is the server running?', issues: [], suggestions: [] });
    } finally {
      setReviewing(false);
    }
  }

  if (!joined) {
    return (
      <div className="join-screen">
        <div className="join-card">
          <div className="join-prompt">
            <span className="prompt-symbol">$</span> collabcode --join
            <span className="cursor-blink">▌</span>
          </div>
          <h1>CollabCode</h1>
          <p className="join-sub">Real-time pair programming rooms with live cursors and AI code review.</p>
          <label className="join-label" htmlFor="room-input">room name</label>
          <input
            id="room-input"
            value={room}
            onChange={(e) => setRoom(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && room.trim() && setJoined(true)}
            placeholder="e.g. dsa-lab-3"
            autoFocus
          />
          <button className="btn-primary" onClick={() => room.trim() && setJoined(true)}>
            Join room
          </button>
          <div className="join-stats" aria-label="CollabCode highlights">
            <span>Live sync</span>
            <span>Shared rooms</span>
            <span>AI review</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <div className="brand">CollabCode</div>
          <div className="room-pill">
            <span className="live-dot" aria-hidden="true" />
            room <strong>{room}</strong>
          </div>
        </div>
        <div className="topbar-actions">
          <select value={language} onChange={(e) => setLanguage(e.target.value)} aria-label="Language">
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
            <option value="cpp">C++</option>
          </select>
          <button className="btn-primary" onClick={handleReview} disabled={reviewing}>
            {reviewing ? 'Reviewing...' : 'AI Review'}
          </button>
        </div>
      </header>

      <div className="main-area">
        {provider ? (
          <CodeEditor ytext={ytext} awareness={provider.awareness} language={language} />
        ) : (
          <div className="editor-container connecting">Connecting…</div>
        )}
        <aside className="sidebar">
          <UserList users={users} you={{ name, color }} />
          <ReviewPanel review={review} loading={reviewing} />
        </aside>
      </div>
    </div>
  );
}
