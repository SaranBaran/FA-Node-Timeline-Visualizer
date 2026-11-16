
import './App.css'
import Timeline from './Timeline';
import { useEffect, useState } from "react"; 

function App() {
  const [data, setData] = useState(null); 
  const [error, setError] = useState(null);
  useEffect(() => {                                
    fetch("/data.json")
      .then((res) => {if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json(); 
      })
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);
  if (error) return <p>Could not load data.json: {error}</p>;
  if (!data) return <p>Loading…</p>;

  return (
    <main>
      <p>{data.nodes.length} nodes, {data.edges.length} edges</p>
      <Timeline />
    </main>
  )
}

export default App
