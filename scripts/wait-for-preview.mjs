const url = process.env.TEST_BASE_URL || 'http://127.0.0.1:5173';
let ready = false;
for (let attempt = 0; attempt < 60; attempt++) {
  try { const response = await fetch(url); if (response.ok) { ready = true; break; } } catch { /* server is still starting */ }
  await new Promise(resolve => setTimeout(resolve, 1000));
}
if (!ready) { console.error(`Preview did not become ready: ${url}`); process.exitCode = 1; }
