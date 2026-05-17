const http = require("http");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const { startAutoScanner } = require("./lib/jobs/autoIpScanner");
const app = require("./api/index.js");
const PORT = parseInt(process.env.PORT || "4000", 10);

const server = http.createServer(app);
server.listen(PORT, () => {
  process.stdout.write(`API server running on http://localhost:${PORT}\n`);
  if (process.env.DISABLE_BACKGROUND_JOBS !== "1") {
    startAutoScanner();
  }
});
