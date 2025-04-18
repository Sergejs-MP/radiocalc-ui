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

// backend URL
const API = import.meta.env.VITE_API + "/calculate";

// result type from backend
interface Result {
  total_dose: number;
  bed: number;
  eqd2: number;
  time_corrected_bed: number;
  survival_fraction: number;
}

// preset dropdown options
import tumourOptions from "./data/tumour_presets.json";
import oarOptions from "./data/oar_presets.json";

export default function App() {
  // form state
  const [inp, setInp] = useState({
    d: 2,
    n: 30,
    t: 40,
    abTumour: 10,
    abOAR: 3,
  });

  // app state
  const [res, setRes] = useState<Result | null>(null);
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [tumourIdx, setTumourIdx] = useState(0);
  const [oarIdx, setOarIdx] = useState(0);

  /* ---------- handlers ---------- */
  const handleChange =
    (key: keyof typeof inp) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setInp({ ...inp, [key]: +e.target.value });

  const handleTumourSelect = (e: any) => {
    const idx = e.target.value as number;
    setTumourIdx(idx);
    setInp({ ...inp, abTumour: tumourOptions[idx].ab });
  };

  const handleOarSelect = (e: any) => {
    const idx = e.target.value as number;
    setOarIdx(idx);
    setInp({ ...inp, abOAR: oarOptions[idx].ab });
  };

  /* ---------- API call ---------- */
  const calc = async () => {
    setLoading(true);
    try {
      const { data } = await axios.post<Result>(API, {
        dose_per_fraction: inp.d,
        number_of_fractions: inp.n,
        treatment_time: inp.t,
        alpha_beta: inp.abTumour,
      });
      setRes(data);
      setTab(0);
    } catch (err) {
      console.error(err);
      alert("Calculation failed – see console");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 4, fontFamily: "sans-serif" }}>
      <Paper sx={{ p: 3 }} elevation={3}>
        <h2>Radiobiology Calculator</h2>

        {/* ---------- input fields ---------- */}
        <Stack spacing={2}>
          <FormControl fullWidth>
            <InputLabel>Tumour model</InputLabel>
            <Select
              value={tumourIdx}
              label="Tumour model"
              onChange={handleTumourSelect}
            >
              {tumourOptions.map((opt, i) => (
                <MenuItem key={opt.label} value={i}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Normal tissue model</InputLabel>
            <Select
              value={oarIdx}
              label="Normal tissue model"
              onChange={handleOarSelect}
            >
              {oarOptions.map((opt, i) => (
                <MenuItem key={opt.label} value={i}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="α / β Tumour (Gy)"
            type="number"
            value={inp.abTumour}
            onChange={handleChange("abTumour")}
          />
          <TextField
            label="α / β Normal tissue (Gy)"
            type="number"
            value={inp.abOAR}
            onChange={handleChange("abOAR")}
          />
          <TextField
            label="Dose / fraction (Gy)"
            type="number"
            value={inp.d}
            onChange={handleChange("d")}
          />
          <TextField
            label="# Fractions"
            type="number"
            value={inp.n}
            onChange={handleChange("n")}
          />
          <TextField
            label="Overall time (days)"
            type="number"
            value={inp.t}
            onChange={handleChange("t")}
          />

          <Button
            variant="contained"
            onClick={calc}
            disabled={
              loading ||
              [inp.d, inp.n, inp.t, inp.abTumour].some(
                (v) => v === undefined || v === null || v === 0
              )
            }
          >
            {loading ? "Calculating…" : "Calculate"}
          </Button>
        </Stack>

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

            <Tabs
              value={tab}
              onChange={(_, v) => setTab(v)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{ mb: 1 }}
            >
              <Tab label="Cell survival" />
              <Tab label="TCP / NTCP (lines)" />
              <Tab label="TCP / NTCP (shaded)" />
            </Tabs>

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

            {tab === 1 && (
              <TcpNtcpPlot
                eqd2={res.eqd2}
                tumour={tumourOptions[tumourIdx]}
                oar={oarOptions[oarIdx]}
              />
            )}

            {tab === 2 && (
              <TcpNtcpPlot
                eqd2={res.eqd2}
                tumour={tumourOptions[tumourIdx]}
                oar={oarOptions[oarIdx]}
                shaded
              />
            )}
          </Box>
        )}
      </Paper>

      {/* loading overlay */}
      <Backdrop
        sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={loading}
      >
        <CircularProgress color="inherit" />
      </Backdrop>
    </Container>
  );
}