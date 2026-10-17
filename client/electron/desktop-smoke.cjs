const fs = require('node:fs');

// Used by CI to verify the packaged runtime without opening a window.
async function runDesktopSmoke(api, kernel, app) {
  const response = await api.handle({ method: 'system.info' });
  kernel.close();
  const report = {
    ...response,
    applicationVersion: app.getVersion(),
    electronVersion: process.versions.electron,
  };
  if (process.env.MIDOTECA_SMOKE_REPORT) {
    fs.writeFileSync(process.env.MIDOTECA_SMOKE_REPORT, JSON.stringify(report));
  }
  console.log(`MIDOTECA_SMOKE ${JSON.stringify(report)}`);
  app.exit(response.ok ? 0 : 1);
}

module.exports = { runDesktopSmoke };
