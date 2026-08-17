const fs = require('fs');

const rawHeroes = JSON.parse(fs.readFileSync('data/participants.json')).slice(1);
const rawActivities = JSON.parse(fs.readFileSync('data/rawdata_all.json')).slice(1);

const heroMap = {};
rawHeroes.forEach(row => {
   if(row.length < 3) return;
   const name = row[0].trim();
   heroMap[name] = {
      name: name,
      maxHr: 220 - parseInt(row[1]),
      guild: row[2].trim()
   };
});

let heroAggregates = {};
Object.keys(heroMap).forEach(n => {
   heroAggregates[n] = { physDmg: 0, magDmg: 0, maxGap: 0, validCount: 0, critDmg: 0, total: 0 };
});

const seasonStartDate = new Date('2026/07/27');

rawActivities.forEach(row => {
   if(row.length < 10) return;
   const name = row[1].trim();
   if(!heroMap[name]) return;

   const dateStr = row[2].replace('上午', 'AM').replace('下午', 'PM');
   let actDate = new Date(dateStr);
   if(isNaN(actDate.getTime())) actDate = new Date(row[2].split(' ')[0]);
   
   if(actDate < seasonStartDate) return;

   const duration = parseFloat(row[5]) || 0;
   const avgHr = parseFloat(row[8]) || 0;
   const maxHr = parseFloat(row[9]) || 0;
   const calories = parseFloat((row[11] || '0').replace('*','')) || 0;

   const hero = heroMap[name];
   
   let trimp = 0;
   if(hero.maxHr > 0 && avgHr > 0) {
      const ratio = avgHr / hero.maxHr;
      trimp = duration * ratio * Math.exp(1.92 * ratio);
   }

   let gap = Math.max(0, maxHr - avgHr);
   const isValid = duration >= 30.0;

   if(isValid) {
      let physDmg = Math.round(calories);
      let magDmg = Math.round(trimp * 15);
      
      heroAggregates[name].physDmg += physDmg;
      heroAggregates[name].magDmg += magDmg;
      heroAggregates[name].maxGap = Math.max(heroAggregates[name].maxGap, gap);
      heroAggregates[name].validCount += 1;
   }
});

let m = heroAggregates["Mooooo"];
m.critDmg = m.validCount > 0 ? Math.round(m.maxGap * 100) : 0;
m.total = m.physDmg + m.magDmg + m.critDmg;

console.log("SupabaseSync logic for Mooooo:");
console.log(`Total: ${m.total} | Phys: ${m.physDmg} | Mag: ${m.magDmg} | Crit: ${m.critDmg} | Max Gap: ${m.maxGap}`);
