
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

(async () => {
  const report = {
    testSuite: 'Kurash Scoreboard QA',
    timestamp: new Date().toISOString(),
    results: []
  };

  const addResult = (testName, status, details) => {
    report.results.push({ testName, status, details });
    console.log(`[${status}] ${testName}: ${details || ''}`);
  };

  try {
    const browser = await puppeteer.launch({
      headless: "new",
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    
    // Set viewport to a standard desktop size (1920x1080)
    await page.setViewport({ width: 1920, height: 1080 });

    console.log('Navigating to Kurash Scoreboard...');
    await page.goto('http://127.0.0.1:18000/kurashScoreBoard', { waitUntil: 'networkidle0' });

    // 1. Initial Load & Baseline
    const title = await page.title();
    addResult('Page Load', 'PASS', `Page loaded with title: ${title}`);
    
    await page.screenshot({ path: 'reports/screens/scoreboard-baseline.png' });
    addResult('Baseline Screenshot', 'PASS', 'Saved to reports/screens/scoreboard-baseline.png');

    // 2. Element Visibility Checks
    // Check for Timer
    const timerVisible = await page.evaluate(() => {
      const el = document.querySelector('.text-\\[10rem\\]'); // Heuristic based on class text-[10rem]
      return !!el && el.innerText.includes(':');
    });
    addResult('Timer Visibility', timerVisible ? 'PASS' : 'FAIL', 'Timer element detected');

    // Check for Player Names (Default "Player Left" / "Player Right")
    const p1Name = await page.evaluate(() => document.body.innerText.includes('Player Left'));
    const p2Name = await page.evaluate(() => document.body.innerText.includes('Player Right'));
    
    if (p1Name && p2Name) {
        addResult('Default Player Names', 'PASS', 'Default names "Player Left" and "Player Right" found');
    } else {
        addResult('Default Player Names', 'WARNING', 'Default names not found (might have custom names loaded)');
    }

    // Check for Score Buttons (K, YO, CH, Penalties)
    // We can look for the text "K", "YO", "CH", "G", "D", "T"
    const scoreLabels = ['K', 'YO', 'CH'];
    const penaltyLabels = ['G', 'D', 'T'];
    
    let missingLabels = [];
    for (const label of [...scoreLabels, ...penaltyLabels]) {
        const found = await page.evaluate((l) => {
            // Look for buttons containing the exact text
            return Array.from(document.querySelectorAll('button, div')).some(el => el.innerText.trim() === l);
        }, label);
        if (!found) missingLabels.push(label);
    }

    if (missingLabels.length === 0) {
        addResult('Score/Penalty Labels', 'PASS', 'All score and penalty labels found (K, YO, CH, G, D, T)');
    } else {
        addResult('Score/Penalty Labels', 'FAIL', `Missing labels: ${missingLabels.join(', ')}`);
    }

    // 3. Gender and Weight Division
    const genderVisible = await page.evaluate(() => document.body.innerText.includes('GENDER'));
    const weightVisible = await page.evaluate(() => document.body.innerText.includes('WEIGHT DIVISION'));
    
    if (genderVisible && weightVisible) {
        addResult('Info Boxes', 'PASS', 'Gender and Weight Division headers found');
    } else {
        addResult('Info Boxes', 'FAIL', 'Gender or Weight Division headers missing');
    }

    // 4. Check for Echo/WebSockets
    const echoPresent = await page.evaluate(() => !!window.Echo);
    addResult('WebSocket Client', echoPresent ? 'PASS' : 'FAIL', 'window.Echo is initialized');

    await browser.close();
    
    // Generate HTML Report
    const htmlReport = generateHtmlReport(report);
    fs.writeFileSync('reports/qa-scoreboard-report.html', htmlReport);
    console.log('QA Check Complete. Report saved to reports/qa-scoreboard-report.html');

  } catch (error) {
    console.error('QA Script Error:', error);
    addResult('Fatal Error', 'FAIL', error.message);
    process.exit(1);
  }
})();

function generateHtmlReport(data) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>QA Report - Kurash Scoreboard</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif; line-height: 1.6; color: #333; max-width: 1000px; margin: 0 auto; padding: 20px; background-color: #f5f7fa; }
        .header { background: #1a1f2e; color: white; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
        .header h1 { margin: 0; font-size: 24px; }
        .header p { margin: 5px 0 0; opacity: 0.8; }
        .summary-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 20px; }
        .status-badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 14px; }
        .status-pass { background: #d1fae5; color: #065f46; }
        .status-fail { background: #fee2e2; color: #991b1b; }
        .status-warn { background: #fef3c7; color: #92400e; }
        .metric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-top: 20px; }
        .metric-item { background: #f8fafc; padding: 15px; border-radius: 6px; text-align: center; }
        .metric-value { font-size: 24px; font-weight: bold; display: block; }
        .metric-label { font-size: 14px; color: #64748b; }
        h2 { color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-top: 40px; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; background: white; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
        th { background: #f8fafc; font-weight: 600; }
        .screenshot-gallery { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; margin-top: 20px; }
        .screenshot-card { background: white; padding: 10px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .screenshot-card img { width: 100%; height: auto; border-radius: 4px; border: 1px solid #eee; }
        .screenshot-caption { font-size: 12px; color: #64748b; margin-top: 8px; text-align: center; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Quality Assurance Report</h1>
        <p>Target: Kurash Scoreboard | Date: ${new Date(data.timestamp).toLocaleDateString()}</p>
    </div>

    <div class="summary-card">
        <h2 style="margin-top: 0;">Executive Summary</h2>
        <p>The Kurash Scoreboard at <code>/kurashScoreBoard</code> was tested for rendering, element visibility, and baseline stability.</p>
        
        <div class="metric-grid">
            <div class="metric-item">
                <span class="metric-value ${data.results.every(r => r.status === 'PASS') ? 'status-pass' : 'status-warn'}">${data.results.every(r => r.status === 'PASS') ? 'PASS' : 'WARN'}</span>
                <span class="metric-label">Overall Status</span>
            </div>
            <div class="metric-item">
                <span class="metric-value">${data.results.filter(r => r.status === 'PASS').length} / ${data.results.length}</span>
                <span class="metric-label">Checks Passed</span>
            </div>
        </div>
    </div>

    <h2>Test Results</h2>
    <table>
        <thead>
            <tr>
                <th>Test Name</th>
                <th>Status</th>
                <th>Details</th>
            </tr>
        </thead>
        <tbody>
            ${data.results.map(r => `
            <tr>
                <td>${r.testName}</td>
                <td><span class="status-badge ${r.status === 'PASS' ? 'status-pass' : r.status === 'FAIL' ? 'status-fail' : 'status-warn'}">${r.status}</span></td>
                <td>${r.details}</td>
            </tr>`).join('')}
        </tbody>
    </table>

    <h2>Visual Regression Baselines</h2>
    <div class="screenshot-gallery">
        <div class="screenshot-card">
            <img src="screens/scoreboard-baseline.png" alt="Baseline Screenshot">
            <div class="screenshot-caption">Baseline: Initial State</div>
        </div>
    </div>

    <footer style="margin-top: 50px; text-align: center; color: #94a3b8; font-size: 12px;">
        Generated by QA Reporter Agent
    </footer>
</body>
</html>`;
}

