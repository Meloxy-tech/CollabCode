export default function UserList({ users, you }) {
  const others = users.filter((u) => u.name !== you.name);

  return (
    <div className="panel">
      <h3 className="panel-title">Online — {others.length + 1}</h3>
      <ul className="user-list">
        <li>
          <span className="dot" style={{ background: you.color }} />
          {you.name} <span className="tag-you">you</span>
        </li>
        {others.map((u, i) => (
          <li key={i}>
            <span className="dot" style={{ background: u.color }} />
            {u.name}
          </li>
        ))}
      </ul>
    </div>
  );
}
