import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Landing } from './pages';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        {/* Add more routes here */}
      </Routes>
    </Router>
  );
}

export default App;
