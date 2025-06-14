const express = require("express");
const { createCanvas } = require("canvas");
const echarts = require("echarts");

const app = express();
const PORT = 3001;

app.use(express.json({ limit: "2mb" }));

app.post("/generate-chart", (req, res) => {
  try {
    const { width = 600, height = 400, option } = req.body;

    if (!option) {
      return res
        .status(400)
        .json({ error: 'Missing "option" in request body' });
    }

    const canvas = createCanvas(width, height);
    const chart = echarts.init(canvas);
    chart.setOption(option);
    const imageBuffer = canvas.toBuffer("image/png");
    chart.dispose();

    res.set("Content-Type", "image/png");
    res.send(imageBuffer);
  } catch (err) {
    console.error("Chart render error:", err);
    res.status(500).json({ error: "Failed to render chart" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Chart service listening at http://localhost:${PORT}`);
});
