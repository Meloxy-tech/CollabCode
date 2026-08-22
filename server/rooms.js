// In-memory registry of active rooms.
// Good enough for a demo/portfolio project; swap for Redis/Postgres
// if you need rooms to survive a server restart.

const rooms = new Map();

export function registerRoom(name) {
  if (!rooms.has(name)) {
    rooms.set(name, { name, createdAt: Date.now(), lastActive: Date.now() });
  }
}

export function touchRoom(name) {
  const room = rooms.get(name);
  if (room) room.lastActive = Date.now();
}

export function listRooms() {
  return Array.from(rooms.values()).sort((a, b) => b.lastActive - a.lastActive);
}
