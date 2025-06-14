import { serve } from "bun";
import { createCanvas } from "canvas";
import * as echarts from "echarts";

const PORT = 3001;

serve({
  port: PORT,
  fetch: async (req: Request) => {
    try {
      const body = await req.json();
      const chartOptions = body;

      if (!chartOptions) {
        return new Response(
          JSON.stringify({
            error: "Chart options are required in the request body.",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      const base64 = renderChart(chartOptions);
      return new Response(JSON.stringify({data: base64}, {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error generating chart:", error);
      return new Response(JSON.stringify({ error: "Internal server error." }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
});

console.log(`Server is running on http://localhost:${PORT}`);

function renderChart(options: any) {
  const canvas = createCanvas(options.width || 600, options.height || 400);
  const chart = echarts.init(canvas as any);
  const op = options.option;
  op.animation = false;
  chart.setOption(op);
  const base64 = canvas.toDataURL("image/png");
  chart.dispose();
  return base64;
}
