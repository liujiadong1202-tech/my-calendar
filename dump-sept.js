// 打印2026年9月逐日分类（复刻 app 逻辑），定位 24/24 分歧
async function main() {
    const res = await fetch('https://cdn.jsdelivr.net/gh/NateScarlet/holiday-cn@master/2026.json');
    const data = await res.json();
    const holidayMap = new Map(), extraMap = new Map();
    data.days.filter(it => it.date.startsWith('2026-09') || it.date.startsWith('2026-08') || it.date.startsWith('2026-10'))
             .forEach(item => {
        if (item.isOffDay) holidayMap.set(item.date, item.name);
        else extraMap.set(item.date, item.name || '班');
    });
    const show = (m, last) => {
        console.log(`\n==== ${m}月 ====`);
        for (let d = 1; d <= last; d++) {
            const dateStr = `2026-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
            const holidayName = holidayMap.get(dateStr);
            const extraName = extraMap.get(dateStr);
            const dow = new Date(2026, m-1, d).getDay();
            const wk = ['日','一','二','三','四','五','六'][dow];
            if (holidayName || extraName) console.log(`${dateStr} 周${wk}  假:${holidayName||'-'}  班:${extraName||'-'}`);
        }
    };
    show(8, 31); show(9, 30); show(10, 31);
}
main().catch(e => console.error(e));
