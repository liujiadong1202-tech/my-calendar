// 独立复刻 index.html 中日分类与统计逻辑，验证各月显示口径
// 运行: node simulate-attendance.js [year] [todayStr] [mode]
const fs = require('fs');

const year = parseInt(process.argv[2] || '2026', 10);
const todayStr = process.argv[3] || '2026-10-22';
const mode = process.argv[4] || 'sun';
const manualOt = {}; // 模拟无手动修正（用户仅手动设过 2026-08-16）

async function main() {
    const res = await fetch(`https://cdn.jsdelivr.net/gh/NateScarlet/holiday-cn@master/${year}.json`);
    const data = await res.json();
    const holidayMap = new Map(), extraMap = new Map();
    data.days.forEach(item => {
        if (item.isOffDay) holidayMap.set(item.date, item.name);
        else extraMap.set(item.date, item.name || '班');
    });

    // 复刻 STATUTORY_BY_NAME / refreshStatutoryConstants
    const STATUTORY_BY_NAME = [['元旦',1],['春节',4],['清明',1],['劳动',2],['端午',1],['中秋',1],['国庆',3]];
    const statutoryByMonth = {};
    const nameFirstMonth = {};
    for (const [d, name] of holidayMap) {
        if (!name) continue;
        const m = parseInt(d.substring(5,7),10) - 1;
        if (nameFirstMonth[name] == null || m < nameFirstMonth[name]) nameFirstMonth[name] = m;
    }
    for (const [name, m] of Object.entries(nameFirstMonth)) {
        let c = 0;
        for (const [kw, v] of STATUTORY_BY_NAME) if (name.includes(kw)) { c += v; break; }
        if (c > 0) { const key = `${year}-${m}`; statutoryByMonth[key] = (statutoryByMonth[key] || 0) + c; }
    }

    console.log(`今天=${todayStr}  模式=${mode}`);
    console.log('月 | 出勤已过/总上班(含加班) | 计薪天数 | 周内假 | 节日常数 | 班/加班/补班');
    for (let m = 0; m < 12; m++) {
        const c = { totalDays:0, standardWork:0, overtimeWork:0, weekendOff:0, holidayOff:0, salaryDays:0, weekdayHolidayDays:0, passedWork:0, totalWork:0, pureWork:0, extraWork:0 };
        c.totalDays = new Date(year, m+1, 0).getDate();
        for (let d = 1; d <= c.totalDays; d++) {
            const dateStr = `${year}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
            const holidayName = holidayMap.get(dateStr);
            const extraName = extraMap.get(dateStr);
            const dayOfWeek = new Date(year, m, d).getDay();
            const isWknd = (dayOfWeek === 0 || dayOfWeek === 6);
            if (!isWknd) { c.salaryDays++; if (holidayName) c.weekdayHolidayDays++; }
            else if (extraName) { c.salaryDays++; }

            // 推荐值（复刻 sun 模式）
            let autoStatus = 'work', isWorking = true;
            if (holidayName) { autoStatus = 'holiday'; isWorking = false; }
            else if (extraName) { autoStatus = 'extra'; isWorking = true; }
            else {
                const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
                if (isWeekend) {
                    const prev = new Date(year, m, d - 1);
                    const prevStr = `${prev.getFullYear()}-${String(prev.getMonth()+1).padStart(2,'0')}-${String(prev.getDate()).padStart(2,'0')}`;
                    const isSunAfterExtraSat = (mode === 'sun' && dayOfWeek === 0 && extraMap.has(prevStr));
                    if (isSunAfterExtraSat) { autoStatus = 'weekend-off'; isWorking = false; }
                    else if ((mode === 'sat' && dayOfWeek === 6) || (mode === 'sun' && dayOfWeek === 0) || mode === 'none') { autoStatus = 'overtime'; isWorking = true; }
                    else { autoStatus = 'weekend-off'; isWorking = false; }
                }
            }
            const status = manualOt[dateStr] || autoStatus;
            const startMonth = 4 - 1; // 入职2026-04-15，之前的月不计——仅影响薪资不影响出勤
            if (status === 'holiday') c.holidayOff++;
            else if (status === 'extra') c.standardWork++;
            else if (status === 'overtime') c.overtimeWork++;
            else if (status === 'weekend-off') c.weekendOff++;
            else c.standardWork++;
            if (isWorking) { c.totalWork++; if (dateStr <= todayStr) c.passedWork++; }
        }
        const statute = statutoryByMonth[`${year}-${m}`] || 0;
        c.salaryDays += statute - c.weekdayHolidayDays;
        console.log(
            `${String(m+1).padStart(2,' ')}月 | ` +
            `出勤 ${c.passedWork}/${c.totalWork} (` + (c.totalWork ? Math.round(c.passedWork/c.totalWork*100) : 0) + `%) | ` +
            `计薪 ${c.salaryDays} | 周内假 ${c.weekdayHolidayDays} | 常数+${statute} | ` +
            `班${c.standardWork}/加${c.overtimeWork}`
        );
    }
}
main().catch(e => console.error(e));
