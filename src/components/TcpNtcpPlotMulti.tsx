import Plot from "react-plotly.js";

export interface TissueModel {
  label: string;
  D50: number;
  gamma50: number;
}

interface Props {
  eqd2: number;                 // plan EQD2 (tumour or total)
  tumour: TissueModel;          // single tumour model
  oars: TissueModel[];          // 0‑N OAR models
}

const buildSigmoid = (
  D50: number,
  gamma50: number,
  doses: number[],
) =>
  doses.map((D) => 1 / (1 + Math.exp(-4 * gamma50 * (D - D50) / D50)));

export default function TcpNtcpPlotMulti({
  eqd2,
  tumour,
  oars,
}: Props) {
  const doseAxis = Array.from({ length: 101 }, (_, i) => i); // 0‑100 Gy

  /* auto‑assign distinct hues to OARs */
  const baseHue = 0;
  const hueStep = 360 / Math.max(1, oars.length);

  return (
    <Plot
      data={[
        /* tumour line */
        {
          x: doseAxis,
          y: buildSigmoid(tumour.D50, tumour.gamma50, doseAxis),
          name: tumour.label,
          mode: "lines",
          line: { width: 2 },
        },
        /* one shaded trace per OAR */
        ...oars.map((oar, i) => {
          const hue = baseHue + i * hueStep;
          return {
            x: doseAxis,
            y: buildSigmoid(oar.D50, oar.gamma50, doseAxis),
            name: oar.label,
            mode: "lines",
            fill: "tozeroy",
            fillcolor: `hsla(${hue},70%,60%,0.25)`,
            line: { width: 1 },
          };
        }),
        /* EQD2 vertical marker */
        {
          x: [eqd2, eqd2],
          y: [0, 1],
          name: `Plan EQD₂ = ${eqd2.toFixed(1)} Gy`,
          mode: "lines",
          line: { dash: "dash" },
        },
      ]}
      layout={{
        title: "TCP / NTCP overlay",
        xaxis: { title: "EQD₂ (Gy)" },
        yaxis: { title: "Probability", range: [0, 1] },
        legend: { orientation: "h", y: -0.25 },
      }}
      style={{ width: "100%", height: 420 }}
    />
  );
}