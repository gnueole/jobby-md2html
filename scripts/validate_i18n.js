const fs = require("fs");
const path = require("path");

const localesDir = path.join(__dirname, "..", "public", "locales");

function getKeys(obj, prefix = "") {
  let keys = [];
  for (const key in obj) {
    if (typeof obj[key] === "object" && obj[key] !== null) {
      keys = keys.concat(getKeys(obj[key], prefix ? `${prefix}.${key}` : key));
    } else {
      keys.push(prefix ? `${prefix}.${key}` : key);
    }
  }
  return keys.sort();
}

try {
  const files = fs.readdirSync(localesDir).filter((f) => f.endsWith(".json"));
  if (files.length === 0) {
    console.log("No locale JSON files found.");
    process.exit(0);
  }

  const baseFile = files.includes("fr.json") ? "fr.json" : files[0];
  const baseContent = JSON.parse(fs.readFileSync(path.join(localesDir, baseFile), "utf8"));
  const baseKeys = getKeys(baseContent);

  console.log(
    `Checking ${files.length} locale files against base '${baseFile}' (${baseKeys.length} keys)...`
  );

  let errors = 0;
  files.forEach((file) => {
    if (file === baseFile) return;
    const content = JSON.parse(fs.readFileSync(path.join(localesDir, file), "utf8"));
    const keys = getKeys(content);

    const missing = baseKeys.filter((k) => !keys.includes(k));
    const extra = keys.filter((k) => !baseKeys.includes(k));

    if (missing.length > 0) {
      console.error(`❌ ${file} missing ${missing.length} keys:`, missing.slice(0, 5));
      errors++;
    }
    if (extra.length > 0) {
      console.warn(`⚠️ ${file} has ${extra.length} extra keys:`, extra.slice(0, 5));
    }
  });

  if (errors > 0) {
    console.error(`\ni18n validation failed with ${errors} error(s).`);
    process.exit(1);
  } else {
    console.log("✅ All locale files are in sync!");
  }
} catch (err) {
  console.error("Error validating i18n locales:", err);
  process.exit(1);
}
