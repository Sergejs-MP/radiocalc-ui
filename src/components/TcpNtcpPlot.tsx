import Plot from "react-plotly.js";

export interface TissueModel {
  D50: number;
  gamma50: number;
  label: string;
}

interface Props {
  eqd2: number;
  tumour: TissueModel;
  oar: TissueModel;
  shaded?: boolean;
}

const buildSigmoid = (
  D50: number,
  gamma50: number,
  doses: number[],
): number[] =>
  doses.map((D) => 1 / (1 + Math.exp(-4 * gamma50 * (D - D50) / D50)));

export default function TcpNtcpPlot({
  eqd2,
  tumour,
  oar,
  shaded = false,
}: Props) {
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
          ...(shaded && { fill: "tozeroy", fillcolor: "rgba(0,123,255,0.25)" }),
        },
        {
          x: doseAxis,
          y: buildSigmoid(oar.D50, oar.gamma50, doseAxis),
          name: oar.label,
          type: "scatter",
          mode: "lines",
          ...(shaded && { fill: "tonexty", fillcolor: "rgba(220,53,69,0.25)" }),
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
        title: shaded ? "TCP / NTCP (shaded areas)" : "TCP / NTCP",
        xaxis: { title: "EQD₂ (Gy)" },
        yaxis: { title: "Probability", range: [0, 1] },
        legend: { orientation: "h", y: -0.25 },
      }}
      style={{ width: "100%", height: 400 }}
    />
  );
}