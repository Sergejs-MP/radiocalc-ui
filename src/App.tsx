import { useState } from "react";
import axios from "axios";
import Plot from "react-plotly.js";

import {
  Container,
  Paper,
  TextField,
  Button,
  Stack,
  Tabs,
  Tab,
  Box,
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

export default function App() {
  const [inp, setInp] = useState({ d: 2, n: 30, t: 40, ab: 10 });
  const [res, setRes] = useState<Result | null>(null);
  const [tab, setTab] = useState(0);

  const handleChange =
    (key: keyof typeof inp) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setInp({ ...inp, [key]: +e.target.value });

  const calc = async () => {
    const { data } = await axios.post<Result>(API, {
      dose_per_fraction: inp.d,
      number_of_fractions: inp.n,
      treatment_time: inp.t,
      alpha_beta: inp.ab,
    });
    setRes(data);
    setTab(0); // always show survival tab first
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
          <TextField
            label="α / β (Gy)"
            type="number"
            value={inp.ab}
            onChange={handleChange("ab")}
          />
          <Button
            variant="contained"
            onClick={calc}
            disabled={Object.values(inp).some((v) => !v)}
          >
            Calculate
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
              <TcpNtcpPlot eqd2={res.eqd2} buildSigmoid={buildSigmoid} />
            )}
          </Box>
        )}
      </Paper>
    </Container>
  );
}

/* ------------------ separate component for TCP / NTCP ------------------ */
function TcpNtcpPlot({
  eqd2,
  buildSigmoid,
}: {
  eqd2: number;
  buildSigmoid: (D50: number, gamma50: number, doses: number[]) => number[];
}) {
  // reference params (adjust or make them inputs later)
  const tumour = { D50: 60, gamma50: 2.5, label: "TCP (tumour)" };
  const cord = { D50: 50, gamma50: 1.0, label: "NTCP (cord)" };

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
          y: buildSigmoid(cord.D50, cord.gamma50, doseAxis),
          name: cord.label,
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