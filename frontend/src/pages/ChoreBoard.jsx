import { Link } from 'react-router-dom';

function ChoreBoard() {
  return (
    <main>
      <h1>This Week’s Chores</h1>

      <ul>
        <li>Wash the dishes — Gary Chiu</li>
        <li>Take out the trash — Omar Mohamed</li>
        <li>Debug the wifi — Chris Zielke</li>
      </ul>

      <Link to="/">Log out</Link>
    </main>
  );
}

export default ChoreBoard;