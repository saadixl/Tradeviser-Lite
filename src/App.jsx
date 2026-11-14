import './App.css';
import Playground from './pages/Playground';

function App() {
  return (
    <div className="App">
      <header className="app-header">
        <h1 className="app-title">Tradeviser Lite</h1>
      </header>
      <main className="app-main">
        <Playground />
        <footer className="app-disclaimer">
          For information and education only, not financial advice. Market data comes from the
          provider you choose and may be delayed or incomplete.
        </footer>
      </main>
    </div>
  );
}

export default App;
