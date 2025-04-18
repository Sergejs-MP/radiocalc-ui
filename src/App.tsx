import { useState } from "react";
import axios from "axios";
import Plot from "react-plotly.js";
import TcpNtcpPlot from "./components/TcpNtcpPlot";

import {
  Container,
  Paper,
  TextField,
  Button,
  Stack,
  Tabs,
  Tab,
  Box,
  Backdrop,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
} from "@mui/material";

// backend URL comes from .env → VITE_API
const API = import.meta.env.VITE_API + "/calculate";

interface Result {
  total_dose: number;
  bed: number;
  eqd2: number;
  time_corrected_bed: number;
  survival_fraction: number;
}

// ----------- load preset tissue options -----------
import tumourOptions from "./data/tumour_presets.json";
import oarOptions    from "./data/oar_presets.json";
export default function App() {
  const [inp, setInp] = useState({
    d: 2,
    n: 30,
    t: 40,
    abTumor: 10,
    abOAR: 3,
  });
  const [res, setRes] = useState<Result | null>(null);
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [tumourIdx, setTumourIdx] = useState(0);
  const [oarIdx, setOarIdx] = useState(0);

  const handleChange =
    (key: keyof typeof inp) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setInp({ ...inp, [key]: +e.target.value });

  const handleTumourSelect = (e: any) => {
    const idx = e.target.value as number;
    setTumourIdx(idx);
    setInp({ ...inp, abTumor: tumourOptions[idx].ab });   // auto‑fill α/β
  };
  const handleOarSelect = (e: any) => {
    const idx = e.target.value as number;
    setOarIdx(idx);
    setInp({ ...inp, abOAR: oarOptions[idx].ab });
  };

  const calc = async () => {
    setLoading(true);
    try {
      const { data } = await axios.post<Result>(API, {
        dose_per_fraction: inp.d,
        number_of_fractions: inp.n,
        treatment_time: inp.t,
        alpha_beta: inp.abTumor,    // backend uses tumour α/β
      });
      setRes(data);
      setTab(0); // always show survival tab first
    } catch (err) {
      console.error(err);
      alert("Calculation failed – see console");
    } finally {
      setLoading(false);
    }
  };


{/* ---------- results ---------- */}
{res && (
  <Box sx={{ mt: 4 }}>
    <pre
      style={{
        background: "#f5f5f5",
        padding: 10,
        whiteSpace: "pre-wrap",
      }}
    >
      {JSON.stringify(res, null, 2)}
    </pre>

    {/* tabs */}
    <Tabs value={tab} onChange={(_, v) => setTab(v)}   variant="scrollable"
    scrollButtons="auto"
    sx={{ mb: 1 }}>
      <Tab label="Cell survival" />
      <Tab label="TCP / NTCP (lines)" />
      <Tab label="TCP / NTCP (shaded)" />
    </Tabs>

    {/* ---- Tab 0 : Survival line ---- */}
    {tab === 0 && (
      <Plot
        data={[
          {
            x: [0, res.total_dose],
            y: [1, res.survival_fraction],
            type: "scatter",
            mode: "lines+markers",
            name: "Tumour survival",
          },
        ]}
        layout={{
          title: "Cell survival (semi‑log)",
          yaxis: { type: "log", title: "Surviving fraction" },
          xaxis: { title: "Physical dose (Gy)" },
        }}
        style={{ width: "100%", height: 400 }}
      />
    )}

    {/* ---- Tab 1 : TCP / NTCP lines ---- */}
    {tab === 1 && (
      <TcpNtcpPlot
        eqd2={res.eqd2}
        tumour={tumourOptions[tumourIdx]}
        oar={oarOptions[oarIdx]}
      />
    )}

    {/* ---- Tab 2 : TCP / NTCP shaded ---- */}
    {tab === 2 && (
      <TcpNtcpPlot
        eqd2={res.eqd2}
        tumour={tumourOptions[tumourIdx]}
        oar={oarOptions[oarIdx]}
        shaded
      />
    )}
  </Box>
)} {/* ← closes  {res && (...)} */}

</Paper>  {/* closes <Paper sx={{ p:3 }}> */}
      <Backdrop
        sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={loading}
      >
        <CircularProgress color="inherit" />
      </Backdrop>
    </Container>
  );
}