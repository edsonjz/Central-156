
const tmaToSeconds = (tma) => {
    if (!tma || tma === '00:00:00') return 0;
    const parts = tma.split(':').map(Number);
    if (parts.length !== 3) return 0;
    return (parts[0] * 3600) + (parts[1] * 60) + parts[2];
};

const secondsToTma = (seconds) => {
    if (!seconds && seconds !== 0) return '00:00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const calculateAverageTma = (tmas) => {
    let sum = 0;
    let count = 0;
    tmas.forEach(t => {
        if (t && t !== '00:00:00') {
            sum += tmaToSeconds(t);
            count++;
        }
    });
    return count > 0 ? secondsToTma(sum / count) : '00:00:00';
};

// Test Cases
console.log("Test 1 (Simple Avg 5:45):", calculateAverageTma(['00:05:00', '00:06:30'])); // Should be 00:05:45
console.log("Test 2 (User says 5:40, System says 5:45):");
// Let's find inputs that produce 5:45 but might look like 5:40
console.log("  Input 345s avg:", calculateAverageTma(['00:05:45', '00:05:45']));
console.log("Test 3 (Truncation):", calculateAverageTma(['00:05:45', '00:05:46'])); // (345+346)/2 = 345.5 -> 00:05:45 (Math.floor)

// What if entries are MM:SS?
console.log("Test 4 (MM:SS entry):", calculateAverageTma(['05:40', '00:05:40']));
// '05:40' split(':') is length 2 -> tmaToSeconds returns 0.
// Sum = 0 + 340 = 340. Count = 2. Avg = 170 -> 00:02:50. (Invalidates my MM:SS theory for higher average)
