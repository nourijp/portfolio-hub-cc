const fs = require('fs');

// Ensure API key is read from env, never hardcoded in frontend or script repo.
const UR_KEY = process.env.UPTIMEROBOT_API_KEY;

if (!UR_KEY) {
  console.error("Error: UPTIMEROBOT_API_KEY environment variable is not set.");
  process.exit(1);
}

const SITES_META = {
  // Core / hub / main
  "https://hamednouri.com":              { name: "Main Portfolio",     category: "Main" },
  "https://hub.hamednouri.com":          { name: "Hub",                category: "Main" },
  "https://resume.hamednouri.com":       { name: "Resume",             category: "Main" },

  // Role-specific portfolio sites
  "https://delivery.hamednouri.com":     { name: "Delivery",           category: "Portfolio" },
  "https://learning.hamednouri.com":     { name: "Learning",           category: "Portfolio" },
  "https://writing.hamednouri.com":      { name: "Writing",            category: "Portfolio" },
  "https://apps.hamednouri.com":         { name: "Apps",               category: "Portfolio" },
  "https://growth.hamednouri.com":       { name: "Growth",             category: "Portfolio" },
  "https://web.hamednouri.com":          { name: "Web",                category: "Portfolio" },
  "https://books.hamednouri.com":        { name: "Books",              category: "Portfolio" },
  "https://author.hamednouri.com":       { name: "Author",             category: "Portfolio" },
  "https://voice.hamednouri.com":        { name: "Voice",              category: "Portfolio" },
  "https://video.hamednouri.com":        { name: "Video",              category: "Portfolio" },
  "https://photo.hamednouri.com":        { name: "Photo",              category: "Portfolio" },
  "https://ai.hamednouri.com":           { name: "AI",                 category: "Portfolio" },
  "https://mindful.hamednouri.com":      { name: "Mindful",            category: "Portfolio" },
  "https://systems.hamednouri.com":      { name: "Systems",            category: "Portfolio" },

  // Japanese / bilingual / solutions sites
  "https://jp.hamednouri.com":           { name: "Japanese Portfolio", category: "Bilingual" },
  "https://solutions.hamednouri.com":    { name: "Solutions",          category: "Bilingual" },
  "https://jp-solutions.hamednouri.com": { name: "JP Solutions",       category: "Bilingual" },

  // Additional areas
  "https://security.hamednouri.com":     { name: "Security",           category: "Additional" },
  "https://ux.hamednouri.com":           { name: "UX",                 category: "Additional" },
  "https://entrepreneur.hamednouri.com": { name: "Entrepreneur",       category: "Additional" },
  "https://networking.hamednouri.com":   { name: "Networking",         category: "Additional" },
  "https://it.hamednouri.com":           { name: "IT",                 category: "Additional" },
  "https://consulting.hamednouri.com":   { name: "Consulting",         category: "Additional" },
  "https://creative.hamednouri.com":     { name: "Creative",           category: "Additional" },
  "https://marketing.hamednouri.com":    { name: "Marketing",          category: "Additional" },
  "https://content.hamednouri.com":      { name: "Content",            category: "Additional" },
  "https://comms.hamednouri.com":        { name: "Comms",              category: "Additional" },
  "https://docs.hamednouri.com":         { name: "Docs",               category: "Additional" },
  "https://portfolio.hamednouri.com":    { name: "Portfolio",          category: "Additional" }
};

function mapUrStatus(code) {
  // 0 = Paused, 1 = Not checked yet / Unknown, 2 = Live, 8 = Seems down / Warning, 9 = Down
  if (code === 2) return "live";
  if (code === 8) return "warning";
  if (code === 9) return "down";
  if (code === 0) return "planned";
  return "unknown"; // covers 1 and any other
}

function normalizeUrl(url) {
  return url.replace(/\/$/, "").toLowerCase();
}

async function main() {
  console.log("Fetching monitors from UptimeRobot...");
  const checkedAt = new Date().toISOString();
  
  const body = new URLSearchParams({
    api_key: UR_KEY,
    format: "json",
  });

  const res = await fetch("https://api.uptimerobot.com/v2/getMonitors", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString()
  });

  if (!res.ok) {
    throw new Error(`UptimeRobot API failed: ${res.status}`);
  }

  const data = await res.json();
  if (data.stat !== "ok") {
    throw new Error(`UptimeRobot API error: ${JSON.stringify(data.error)}`);
  }

  const results = [];
  const urMonitors = data.monitors || [];
  const checkedUrls = new Set();

  for (const mon of urMonitors) {
    const url = normalizeUrl(mon.url);
    checkedUrls.add(url);
    
    let meta = SITES_META[url];
    if (!meta) {
      const foundUrl = Object.keys(SITES_META).find(u => normalizeUrl(u) === url || mon.friendly_name.includes(SITES_META[u].name));
      if (foundUrl) meta = SITES_META[foundUrl];
      else meta = { name: mon.friendly_name, category: "Portfolio" };
    }

    results.push({
      name: meta.name,
      url: mon.url, // ensure correct URL format is retained
      category: meta.category,
      status: mapUrStatus(mon.status),
      httpStatus: mon.status === 2 ? 200 : null,
      responseMs: null,
    });
  }

  // Fill in any missing sites as 'unknown' so we don't show false down states
  for (const [url, meta] of Object.entries(SITES_META)) {
    if (!checkedUrls.has(normalizeUrl(url))) {
      results.push({
        name: meta.name,
        url: url,
        category: meta.category,
        status: "unknown",
        httpStatus: null,
        responseMs: null
      });
    }
  }

  const output = {
    checkedAt,
    sites: results
  };

  fs.writeFileSync('status.json', JSON.stringify(output, null, 2));
  console.log(`Status check complete. Wrote ${results.length} sites to status.json. Total UptimeRobot monitors found: ${urMonitors.length}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
