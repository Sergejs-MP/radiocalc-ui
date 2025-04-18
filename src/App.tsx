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

  /*************************   TCP / NTCP helper  *************************/
  const buildSigmoid = (
    D50: number,
    gamma50: number,
    doses: number[],
  ): number[] =>
    doses.map(
      (D) => 1 / (1 + Math.exp(-4 * gamma50 * (D - D50) / D50)),
    );

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
                <MenuItem key={opt.label} value={i}>{opt.label}</MenuItem>
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
                <MenuItem key={opt.label} value={i}>{opt.label}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="α / β Tumor (Gy)"
            type="number"
            value={inp.abTumor}
            onChange={handleChange("abTumor")}
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
              [inp.d, inp.n, inp.t, inp.abTumor].some((v) => !v && v !== 0)
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

            {/* tabs */}
            <Tabs
              value={tab}
              onChange={(_, v) => setTab(v)}
              centered
              sx={{ mb: 1 }}
            >
              <Tab label="Cell survival" />
              <Tab label="TCP / NTCP" />
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

            {/* ---- Tab 1 : TCP / NTCP S‑curves ---- */}
            {tab === 1 && (
              <TcpNtcpPlot
                eqd2={res.eqd2}
                buildSigmoid={buildSigmoid}
                tumour={tumourOptions[tumourIdx]}
                oar={oarOptions[oarIdx]}
              />
            )}
          </Box>
        )}

        {tab === 2 && (
          <TcpNtcpPlot
            eqd2={res.eqd2}
            tumour={tumourOptions[tumourIdx]}
            oar={oarOptions[oarIdx]}
            shaded
          />
        )}

      </Paper>
      <Backdrop
        sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={loading}
      >
        <CircularProgress color="inherit" />
      </Backdrop>
    </Container>
  );
}

/* ------------------ separate component for TCP / NTCP ------------------ */
function TcpNtcpPlot({
  eqd2,
  buildSigmoid,
  tumour,
  oar,
}: {
  eqd2: number;
  buildSigmoid: (D50: number, gamma50: number, doses: number[]) => number[];
  tumour: { D50: number; gamma50: number; label: string };
  oar: { D50: number; gamma50: number; label: string };
}) {
  const doseAxis = Array.from({ length: 101 }, (_, i) => i); // 0‑100 Gy

  return (
    <Plot
      data={[
        {
          x: doseAxis,
          y: buildSigmoid(tumour.D50, tumour.gamma50, doseAxis),
          name: tumour.label,
          type: "scatter",
          mode: "lines",
        },
        {
          x: doseAxis,
          y: buildSigmoid(oar.D50, oar.gamma50, doseAxis),
          name: oar.label,
          type: "scatter",
          mode: "lines",
        },
        {
          x: [eqd2, eqd2],
          y: [0, 1],
          name: `Plan EQD₂ = ${eqd2.toFixed(1)} Gy`,
          type: "scatter",
          mode: "lines",
          line: { dash: "dash" },
        },
      ]}
      layout={{
        title: "TCP / NTCP",
        xaxis: { title: "EQD₂ (Gy)" },
        yaxis: { title: "Probability", range: [0, 1] },
        legend: { orientation: "h", y: -0.25 },
      }}
      style={{ width: "100%", height: 400 }}
    />
  );
}