import Plot from "react-plotly.js";

export interface TissueModel {
  label: string;
  D50: number;
  gamma50: number;
}

interface Props {
  tumour: TissueModel;
  oar: TissueModel;
  eqd2Tumour: number;   // NEW
  eqd2Oar: number;      // NEW
  shaded?: boolean;
}

const buildSigmoid = (
  D50: number,
  gamma50: number,
  doses: number[],
) => doses.map((D) => 1 / (1 + Math.exp(-4 * gamma50 * (D - D50) / D50)));

export default function TcpNtcpPlot({
  tumour,
  oar,
  eqd2Tumour,
  eqd2Oar,
  shaded = false,
}: Props) {
  const doseAxis = Array.from({ length: 101 }, (_, i) => i); // 0‑100 Gy

  return (
    <Plot
      data={[
        // tumour curve
        {
          x: doseAxis,
          y: buildSigmoid(tumour.D50, tumour.gamma50, doseAxis),
          name: tumour.label,
          mode: "lines",
          line: { width: 2, color: "rgb(33,150,243)" },
          fill: shaded ? "tozeroy" : undefined,
          fillcolor: "rgba(33,150,243,0.25)",
        },
        // OAR curve
        {
          x: doseAxis,
          y: buildSigmoid(oar.D50, oar.gamma50, doseAxis),
          name: oar.label,
          mode: "lines",
          line: { width: 2, color: "rgb(220,53,69)" },
          fill: shaded ? "tozeroy" : undefined,
          fillcolor: "rgba(220,53,69,0.25)",
        },
        // vertical EQD2 markers
        {
          x: [eqd2Tumour, eqd2Tumour],
          y: [0, 1],
          name: `Tumour EQD₂ ${eqd2Tumour.toFixed(1)} Gy`,
          mode: "lines",
          line: { dash: "dash", color: "rgb(33,150,243)" },
        },
        {
          x: [eqd2Oar, eqd2Oar],
          y: [0, 1],
          name: `${oar.label} EQD₂ ${eqd2Oar.toFixed(1)} Gy`,
          mode: "lines",
          line: { dash: "dot", color: "rgb(220,53,69)" },
        },
      ]}
      layout={{
        title: "TCP / NTCP",
        xaxis: { title: "EQD₂ (Gy)" },
        yaxis: { title: "Probability", range: [0, 1] },
        legend: { orientation: "h", y: -0.25 },
      }}
      style={{ width: "100%", height: 420 }}
    />
  );
}