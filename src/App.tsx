import { useState } from "react";
import axios from "axios";
import Plot from "react-plotly.js";

// near the top of App.tsx
const API = import.meta.env.VITE_API + "/calculate";

export default function App() {
  const [inp, setInp] = useState({ d: 2, n: 30, t: 40, ab: 10 });
  const [res, setRes] = useState<any | null>(null);

  const calc = async () => {
    const { data } = await axios.post(API, {
      dose_per_fraction: inp.d,
      number_of_fractions: inp.n,
      treatment_time: inp.t,
      alpha_beta: inp.ab,
    });
    setRes(data);
  };

  return (
    <div style={{ maxWidth: 400, margin: "2rem auto" }}>
      <h2>Radiobiology Calculator</h2>
      {["d", "n", "t", "ab"].map((k) => (
        <div key={k}>
          <label>{k}:</label>
          <input
            type="number"
            value={(inp as any)[k]}
            onChange={(e) => setInp({ ...inp, [k]: +e.target.value })}
          />
        </div>
      ))}
      <button onClick={calc}>Calculate</button>

      {res && (
        <>
          <pre>{JSON.stringify(res, null, 2)}</pre>
          <Plot
            data={[
              {
                x: [0, res.total_dose],
                y: [1, res.survival_fraction],
                type: "scatter",
                mode: "lines+markers",
              },
            ]}
            layout={{ title: "Simple survival line", yaxis: { type: "log" } }}
          />
        </>
      )}
    </div>
  );
}