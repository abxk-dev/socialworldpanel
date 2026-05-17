let started = false;
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const MIN5 = 5 * 60 * 1000;

function startBackgroundJobs() {
  if (started) return;
  if (process.env.DISABLE_BACKGROUND_JOBS === "1") return;
  started = true;

  setTimeout(() => {
    try {
      require("./dripCampaignProcessor").processTick().catch((e) => console.error("[jobs] drip", e));
    } catch (e) {
      console.error("[jobs] drip load", e);
    }
  }, 5000);

  setInterval(() => {
    try {
      require("./dripCampaignProcessor").processTick().catch((e) => console.error("[jobs] drip", e));
    } catch (e) {
      console.error("[jobs] drip load", e);
    }
  }, HOUR);

  setInterval(() => {
    try {
      require("./reorderAlertDetector").runDaily().catch((e) => console.error("[jobs] reorder", e));
    } catch (e) {
      console.error("[jobs] reorder load", e);
    }
  }, DAY);

  setTimeout(() => {
    try {
      require("./providerOrderStatusSync").runTick().catch((e) => console.error("[jobs] provider status", e));
    } catch (e) {
      console.error("[jobs] provider status load", e);
    }
  }, 30000);

  setInterval(() => {
    try {
      require("./providerOrderStatusSync").runTick().catch((e) => console.error("[jobs] provider status", e));
    } catch (e) {
      console.error("[jobs] provider status load", e);
    }
  }, MIN5);
}

module.exports = { startBackgroundJobs };
