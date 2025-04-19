import { useState } from "react";
import axios from "axios";
import Plot from "react-plotly.js";
import TcpNtcpPlot from "./components/TcpNtcpPlot";
import TcpNtcpPlotMulti from "./components/TcpNtcpPlotMulti";
import Autocomplete from "@mui/material/Autocomplete";

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
  Alert,
} from "@mui/material";

// backend URL
const API = import.meta.env.VITE_API + "/calculate";



interface GapResult {
  bed_lost: number;
  eqd2_lost: number;
  extra_physical_dose: number;
  extra_fractions: number;
}
// result type from backend
interface Result {
tumour: {
  total_dose: number;
  bed: number;
  eqd2: number;
  time_corrected_bed: number;
  survival_fraction: number;
};
oars: {
  label: string;
  eqd2: number;
  bed: number;
  /* add other fields if you return them */
}[];
primaryOar?: {          // ← new helper field you add in calc()
  label: string;
  eqd2: number;
};
  gap?: GapResult;
  oarStatus?: "ok" | "warn" | "fail";  
}

// preset dropdown options
import tumourOptions from "./data/tumour_presets.json";
import oarOptions from "./data/oar_presets.json";
import oarLimits from "./data/oar_limits.json";

export default function App() {
  // form state
  const [inp, setInp] = useState({
    d: 2,
    n: 30,
    t: 40,
    gap: 0, 
    abTumour: 10,
    abOAR: 3,
  });

  // app state
  const [res, setRes] = useState<Result | null>(null);
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [tumourIdx, setTumourIdx] = useState(0);
  const [oarIdx, setOarIdx] = useState(0);
  const [selectedOARs, setSelectedOARs] = useState<typeof oarOptions>([]);

  const oarModels = selectedOARs.length ? selectedOARs : [oarOptions[oarIdx]];



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
      // 1. normal BED/EQD2 request
      const { data } = await axios.post(
        API.replace("/calculate", "/calculate_multi"),   // keeps base URL
        {
          dose_per_fraction: inp.d,
          number_of_fractions: inp.n,
          treatment_time: inp.t,
          tumour_ab: inp.abTumour,
          oars: selectedOARs.map(({ label, ab }) => ({ label, alpha_beta: ab })),
          oars: oarModels.map(({ label, ab }) => ({ label, alpha_beta: ab })),
        }
      );
  
      // 2. gap‑compensation request (only if gap > 0)
      let gapData: GapResult | undefined;
      if (inp.gap > 0) {
        const { data: gapRes } = await axios.post<GapResult>(
          API.replace("/calculate", "/gap_compensation"),
          {
            dose_per_fraction: inp.d,
            num_fractions: inp.n,
            alpha_beta: inp.abTumour,
            missed_days: inp.gap,
          }
        );
        gapData = gapRes;
      }
      

      if (!data.oars.length) {
        setRes({ ...data, gap: gapData, oarStatus: null });
        setTab(0);
        return;
      }

      /* ─────────────────────────────────────────────────────────
        NEW: pick the worst‑case OAR and derive traffic‑light
      ────────────────────────────────────────────────────────── */
      type OarResult = Result["oars"][number];
      const worst = data.oars.reduce<OarResult>((acc, o) => {
        const lim = oarLimits[o.label] ?? Infinity;
        return o.eqd2 / lim > acc.eqd2 / (oarLimits[acc.label] ?? Infinity)
          ? o
          : acc;
      }, data.oars[0]);

      const limit = oarLimits[worst.label] as number | undefined;
      let oarStatus: "ok" | "warn" | "fail" | null = null;
      if (limit !== undefined) {
        const ratio = worst.eqd2 / limit;
        oarStatus = ratio >= 1 ? "fail" : ratio >= 0.9 ? "warn" : "ok";
      }

  
      setRes({ ...data, gap: gapData, oarStatus, primaryOar: worst }); 
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

          <Autocomplete
            multiple
            options={oarOptions}
            getOptionLabel={(option) => option.label}
            onChange={(_, value) => setSelectedOARs(value)}
            renderInput={(params) => (
              <TextField {...params} label="OAR models" />
            )}
            />

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
          <TextField
            label="Missed days (gap)"
            type="number"
            value={inp.gap}
            onChange={handleChange("gap")}
          />

          <Button
            variant="contained"
            onClick={calc}
            disabled={
              loading ||
              [inp.d, inp.n, inp.t, inp.abTumour].some(
                (v) => v === undefined || v === null || v === 0
              ) ||
              inp.gap < 0
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
            {res?.gap && (
              <Box sx={{ mb: 2, p: 2, bgcolor: "#eef" }}>
                Lost&nbsp;<b>{res.gap.bed_lost}</b>&nbsp;Gy BED&nbsp;
                (<b>{res.gap.eqd2_lost}</b>&nbsp;Gy EQD₂); need&nbsp;
                <b>{res.gap.extra_physical_dose}</b>&nbsp;Gy ≈&nbsp;
                <b>{res.gap.extra_fractions}</b>&nbsp;extra&nbsp;fraction
                {res.gap.extra_fractions !== 1 && "s"}.
              </Box>
            )}
              {res.oarStatus && res.primaryOar && (
                <Alert severity={      res.oarStatus === "fail"
                  ? "error"
                  : res.oarStatus === "warn"
                  ? "warning"
                  : "success"}>
                  {res.oarStatus === "fail" && (
                    <>EQD₂ {res.primaryOar.eqd2.toFixed(1)} Gy exceeds QUANTEC limit
                    {oarLimits[res.primaryOar.label]} Gy for&nbsp;
                    <b>{res.primaryOar.label}</b>.</>
                  )}
                  {res.oarStatus === "warn" && (
                    <>EQD₂ is {(100*res.primaryOar.eqd2/oarLimits[res.primaryOar.label]).toFixed(0)} %
                    of limit ({res.primaryOar.eqd2.toFixed(1)} Gy).</>
                  )}
                  {res.oarStatus === "ok" && (
                    <>EQD₂ {res.primaryOar.eqd2.toFixed(1)} Gy is below QUANTEC limit for {res.primaryOar.label}.</>
                  )}
                </Alert>
              )}
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
              {selectedOARs.length > 1 && (
                <Tab label="TCP / NTCP (multi)" />
              )}
            </Tabs>

            {tab === 0 && (
              <Plot
                data={[
                  {
                    x: [0, res.tumour.total_dose],
                    y: [1, res.tumour.survival_fraction],
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
              eqd2={res.tumour.eqd2}
                tumour={tumourOptions[tumourIdx]}
                oar={oarOptions[oarIdx]}
              />
            )}


            {tab === 2 && (
              <TcpNtcpPlot
              eqd2={res.tumour.eqd2}
                tumour={tumourOptions[tumourIdx]}
                oar={oarOptions[oarIdx]}
                shaded
              />
            )}

            {tab === 3 && res && (
              <TcpNtcpPlotMulti
                eqd2={res.tumour.eqd2}
                tumour={{ label: tumourOptions[tumourIdx].label, D50: tumourOptions[tumourIdx].D50, gamma50: tumourOptions[tumourIdx].gamma50 }}
                oars={oarModels.map(o => ({
                  label: o.label,
                  D50: o.D50,
                  gamma50: o.gamma50,
                }))}
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