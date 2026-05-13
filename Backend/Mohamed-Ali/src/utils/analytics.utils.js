const { db, admin } = require('../config/firebase');

function getDateRange(period) {
    const now = new Date();
    const startDate = new Date(now);
    
    switch (period) {
        case 'week':
            startDate.setDate(now.getDate() - 7);
            break;
        case 'month':
            startDate.setMonth(now.getMonth() - 1);
            break;
        case 'semester':
            startDate.setMonth(now.getMonth() - 4);
            break;
        case 'year':
            startDate.setFullYear(now.getFullYear() - 1);
            break;
        default:
            return { startDate: null, endDate: null };
    }
    
    startDate.setHours(0, 0, 0, 0);
    now.setHours(23, 59, 59, 999);
    
    return { startDate, endDate: now };
}

function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function getMonthName(monthNumber) {
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[monthNumber - 1];
}

function getDayName(dayNumber) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayNumber];
}

function calculatePercentage(part, total) {
    if (total === 0) return 0;
    return Math.round((part / total) * 100);
}

function groupByDate(records, interval = 'daily') {
    const grouped = {};
    
    for (const record of records) {
        let date = record.timestamp || record.scheduledDate || record.createdAt;
        if (!date) continue;
        
        if (date.toDate) {
            date = date.toDate();
        }
        
        let key;
        if (interval === 'daily') {
            key = date.toISOString().split('T')[0];
        } else if (interval === 'weekly') {
            const weekNum = getWeekNumber(date);
            key = `${date.getFullYear()}-W${weekNum}`;
        } else if (interval === 'monthly') {
            key = `${date.getFullYear()}-${date.getMonth() + 1}`;
        } else {
            key = date.toISOString().split('T')[0];
        }
        
        if (!grouped[key]) {
            grouped[key] = {
                date: key,
                count: 0,
                items: [],
                total: 0,
                present: 0,
                absent: 0
            };
        }
        
        grouped[key].count++;
        grouped[key].items.push(record);
    }
    
    return grouped;
}

async function calculateAttendanceRate(sessionId, totalStudents) {
    return new Promise(async (resolve) => {
        try {
            const attendanceSnap = await db.collection('attendance')
                .where('sessionId', '==', sessionId)
                .where('status', '==', 'PRESENT')
                .get();
            
            const presentCount = attendanceSnap.size;
            const rate = totalStudents > 0 ? (presentCount / totalStudents) * 100 : 0;
            
            resolve({
                presentCount: presentCount,
                absentCount: totalStudents - presentCount,
                rate: Math.round(rate),
                totalStudents: totalStudents
            });
        } catch (error) {
            console.error('Error calculating attendance rate:', error);
            resolve({ presentCount: 0, absentCount: totalStudents, rate: 0, totalStudents: totalStudents });
        }
    });
}

async function getStudentAttendanceSummary(studentId, courseId = null) {
    try {
        let query = db.collection('attendance').where('studentId', '==', studentId);
        
        if (courseId) {
            query = query.where('courseId', '==', courseId);
        }
        
        const snapshot = await query.get();
        const records = snapshot.docs.map(doc => doc.data());
        
        let totalPresent = 0;
        let totalAbsent = 0;
        let totalLate = 0;
        
        for (const record of records) {
            if (record.status === 'PRESENT') totalPresent++;
            if (record.status === 'ABSENT') totalAbsent++;
            if (record.isLate) totalLate++;
        }
        
        return {
            totalPresent: totalPresent,
            totalAbsent: totalAbsent,
            totalLate: totalLate,
            totalRecords: records.length,
            attendanceRate: calculatePercentage(totalPresent, records.length)
        };
    } catch (error) {
        console.error('Error getting student attendance summary:', error);
        return { totalPresent: 0, totalAbsent: 0, totalLate: 0, totalRecords: 0, attendanceRate: 0 };
    }
}

async function getCourseEnrollmentCount(courseId) {
    try {
        const snapshot = await db.collection('enrollments')
            .where('courseId', '==', courseId)
            .where('status', '==', 'ACTIVE')
            .get();
        
        return snapshot.size;
    } catch (error) {
        console.error('Error getting course enrollment count:', error);
        return 0;
    }
}

async function getSessionAttendanceCount(sessionId) {
    try {
        const snapshot = await db.collection('attendance')
            .where('sessionId', '==', sessionId)
            .where('status', '==', 'PRESENT')
            .get();
        
        return snapshot.size;
    } catch (error) {
        console.error('Error getting session attendance count:', error);
        return 0;
    }
}

function formatDateRange(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0],
        startFull: start.toISOString(),
        endFull: end.toISOString()
    };
}

function aggregateTrends(data, interval) {
    const aggregated = [];
    const sortedKeys = Object.keys(data).sort();
    
    for (const key of sortedKeys) {
        const item = data[key];
        aggregated.push({
            period: key,
            value: item.value || 0,
            count: item.count || 0,
            rate: item.rate || 0
        });
    }
    
    return aggregated;
}

function calculateMovingAverage(data, windowSize = 3) {
    const result = [];
    
    for (let i = 0; i < data.length; i++) {
        let sum = 0;
        let count = 0;
        
        for (let j = Math.max(0, i - windowSize + 1); j <= i; j++) {
            const val = data[j].value || data[j].rate || data[j].attendanceRate || 0;
            sum += val;
            count++;
        }
        
        result.push({
            ...data[i],
            movingAverage: Math.round(sum / count)
        });
    }
    
    return result;
}

function calculateStandardDeviation(values) {
    const n = values.length;
    if (n === 0) return 0;
    
    const mean = values.reduce((a, b) => a + b, 0) / n;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
    
    return Math.sqrt(variance);
}

function calculateTrendDirection(data) {
    if (data.length < 2) return 'stable';
    
    const firstHalf = data.slice(0, Math.floor(data.length / 2));
    const secondHalf = data.slice(Math.floor(data.length / 2));
    
    const firstAvg = firstHalf.reduce((a, b) => a + (b.value || b.rate || 0), 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + (b.value || b.rate || 0), 0) / secondHalf.length;
    
    if (secondAvg > firstAvg * 1.05) return 'increasing';
    if (secondAvg < firstAvg * 0.95) return 'decreasing';
    return 'stable';
}

function generateColorForPercentage(percentage) {
    if (percentage >= 90) return '#4CAF50';
    if (percentage >= 75) return '#8BC34A';
    if (percentage >= 60) return '#FFC107';
    if (percentage >= 50) return '#FF9800';
    return '#F44336';
}

function getGradeFromPercentage(percentage) {
    if (percentage >= 90) return 'A+';
    if (percentage >= 85) return 'A';
    if (percentage >= 80) return 'A-';
    if (percentage >= 77) return 'B+';
    if (percentage >= 73) return 'B';
    if (percentage >= 70) return 'B-';
    if (percentage >= 67) return 'C+';
    if (percentage >= 63) return 'C';
    if (percentage >= 60) return 'C-';
    if (percentage >= 50) return 'D';
    return 'F';
}

function formatDuration(minutes) {
    if (!minutes) return '0 min';
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h`;
    return `${mins}m`;
}

function isValidDate(date) {
    const d = new Date(date);
    return d instanceof Date && !isNaN(d);
}

function sortByKey(array, key, order = 'asc') {
    return [...array].sort((a, b) => {
        const valA = a[key];
        const valB = b[key];
        
        if (typeof valA === 'number') {
            return order === 'asc' ? valA - valB : valB - valA;
        }
        
        const strA = String(valA).toLowerCase();
        const strB = String(valB).toLowerCase();
        
        if (order === 'asc') {
            return strA.localeCompare(strB);
        } else {
            return strB.localeCompare(strA);
        }
    });
}

function filterByDateRange(items, startDate, endDate, dateField = 'timestamp') {
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    
    return items.filter(item => {
        let itemDate = item[dateField];
        if (!itemDate) return true;
        
        if (itemDate.toDate) {
            itemDate = itemDate.toDate();
        }
        
        if (start && itemDate < start) return false;
        if (end && itemDate > end) return false;
        
        return true;
    });
}

function paginate(items, page = 1, limit = 20) {
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    
    return {
        items: items.slice(startIndex, endIndex),
        total: items.length,
        page: page,
        limit: limit,
        totalPages: Math.ceil(items.length / limit),
        hasNext: endIndex < items.length,
        hasPrev: page > 1
    };
}

function generateSummaryStats(numbers) {
    if (numbers.length === 0) {
        return { min: 0, max: 0, avg: 0, sum: 0, count: 0 };
    }
    
    const sum = numbers.reduce((a, b) => a + b, 0);
    const min = Math.min(...numbers);
    const max = Math.max(...numbers);
    const avg = sum / numbers.length;
    
    return {
        min: min,
        max: max,
        avg: Math.round(avg * 100) / 100,
        sum: sum,
        count: numbers.length,
        stdDev: Math.round(calculateStandardDeviation(numbers) * 100) / 100
    };
}

module.exports = {
    getDateRange,
    getWeekNumber,
    getMonthName,
    getDayName,
    calculatePercentage,
    groupByDate,
    calculateAttendanceRate,
    getStudentAttendanceSummary,
    getCourseEnrollmentCount,
    getSessionAttendanceCount,
    formatDateRange,
    aggregateTrends,
    calculateMovingAverage,
    calculateStandardDeviation,
    calculateTrendDirection,
    generateColorForPercentage,
    getGradeFromPercentage,
    formatDuration,
    isValidDate,
    sortByKey,
    filterByDateRange,
    paginate,
    generateSummaryStats
};