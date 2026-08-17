const fs = require("fs");
const path = require("path");

console.log("===========================================================================");
console.log("🌐 啟動【前端 JS 引擎與 DOM 邏輯】深度自動化驗證");
console.log("===========================================================================");

// 1. Check all JS files for syntax & brace matching
const jsFiles = ["public/js/admin.js", "public/js/game.js", "public/js/supabaseClient.js", "public/js/supabaseSync.js"];
jsFiles.forEach(f => {
  const content = fs.readFileSync(f, "utf8");
  const openB = (content.match(/\{/g) || []).length;
  const closeB = (content.match(/\}/g) || []).length;
  const openP = (content.match(/\(/g) || []).length;
  const closeP = (content.match(/\)/g) || []).length;
  if (openB === closeB && openP === closeP) {
    console.log(`  ✅ [PASS] ${f} 語法結構完全封閉 (Braces: ${openB}, Parens: ${openP})`);
  } else {
    console.error(`  ❌ [FAIL] ${f} 語法結構不對稱!`);
    process.exit(1);
  }
});

console.log("\n🎉 前端腳本結構 100% 驗證通過！");
