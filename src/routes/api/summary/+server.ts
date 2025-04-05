import { db } from "$lib/server/db";
import { student } from "$lib/server/db/schema";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from './$types';

type MajorCount = { [key: string]: number };
type MajorStats = { [key: string]: { total: number; count: number } };

export const POST: RequestHandler = async ({ request }) => {
    const { question, type } = await request.json();
    const data = await db.select().from(student);

    // Handle predefined queries
    if (type) {
        let response: string;

        // Common calculations
        const maleCount = data.filter(s => s.gender === 'Male').length;
        const femaleCount = data.filter(s => s.gender === 'Female').length;
        const avgGrade = Math.round(data.reduce((acc, s) => acc + s.grade, 0) / data.length);
        const uniqueMajors = [...new Set(data.map(s => s.major))];
        const avgAge = Math.round(data.reduce((acc, s) => acc + s.age, 0) / data.length);
        const ages = data.map(s => s.age);
        const minAge = Math.min(...ages);
        const maxAge = Math.max(...ages);
        const grades = data.map(s => s.grade);
        const highestGrade = Math.max(...grades);
        const lowestGrade = Math.min(...grades);
        const dates = data.map(s => new Date(s.enrollmentDate).getTime());
        const latestEnrollment = new Date(Math.max(...dates)).toLocaleDateString();
        const earliestEnrollment = new Date(Math.min(...dates)).toLocaleDateString();
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

        switch (type) {
            case "summary": {
                const gradeRanges = {
                    '90-100': data.filter(s => s.grade >= 90).length,
                    '80-89': data.filter(s => s.grade >= 80 && s.grade < 90).length,
                    '70-79': data.filter(s => s.grade >= 70 && s.grade < 80).length,
                    'below70': data.filter(s => s.grade < 70).length
                };

                const majorCounts = data.reduce<MajorCount>((acc, s) => {
                    acc[s.major] = (acc[s.major] || 0) + 1;
                    return acc;
                }, {});

                const majorsList = Object.entries(majorCounts)
                    .sort(([,a], [,b]) => b - a)
                    .map(([major, count]) => `* ${major}: ${count} students`)
                    .join('\n');

                response = `### Student Data Overview

**Total Students**: ${data.length}
**Gender Distribution**:
* Male Students: ${maleCount}
* Female Students: ${femaleCount}

### Grade Analysis
**Average Grade**: ${avgGrade}%
**Grade Distribution**:
* 90-100: ${gradeRanges['90-100']} students
* 80-89: ${gradeRanges['80-89']} students
* 70-79: ${gradeRanges['70-79']} students
* Below 70: ${gradeRanges['below70']} students

### Major Distribution
**Total Majors**: ${uniqueMajors.length}
**Popular Majors**:
${majorsList}

### Enrollment Insights
* Latest Enrollment: ${latestEnrollment}
* Earliest Enrollment: ${earliestEnrollment}
* Average Student Age: ${avgAge} years`;
                break;
            }

            case "enrollment": {
                const recentEnrollments = data.filter(s => 
                    new Date(s.enrollmentDate) >= threeMonthsAgo
                ).length;

                const enrollmentMajorCounts = data.reduce<MajorCount>((acc, s) => {
                    acc[s.major] = (acc[s.major] || 0) + 1;
                    return acc;
                }, {});

                const topMajor = Object.entries(enrollmentMajorCounts)
                    .sort(([,a], [,b]) => b - a)[0][0];

                const growingMajors = Object.entries(enrollmentMajorCounts)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 3)
                    .map(([major]) => major)
                    .join(', ');

                const genderRatio = `${Math.round(maleCount / data.length * 100)}% Male / ${Math.round(femaleCount / data.length * 100)}% Female`;

                response = `### Enrollment Analysis

**Current Enrollment Status**
* Total Active Students: ${data.length}
* Recent Enrollments (Last 3 months): ${recentEnrollments}

**Major Distribution Trends**
* Most Popular Major: ${topMajor}
* Growing Majors: ${growingMajors}

**Demographics**
* Age Range: ${minAge} - ${maxAge} years
* Gender Balance: ${genderRatio}`;
                break;
            }

            case "performance": {
                const majorPerformance = Object.entries(
                    data.reduce<MajorStats>((acc, s) => {
                        if (!acc[s.major]) {
                            acc[s.major] = { total: 0, count: 0 };
                        }
                        acc[s.major].total += s.grade;
                        acc[s.major].count++;
                        return acc;
                    }, {})
                )
                    .map(([major, { total, count }]) => 
                        `* ${major}: ${Math.round(total / count)}% average`
                    )
                    .join('\n');

                const topPerformers = data.filter(s => s.grade >= 90).length;
                const bestMajor = Object.entries(
                    data.reduce<MajorStats>((acc, s) => {
                        if (!acc[s.major]) {
                            acc[s.major] = { total: 0, count: 0 };
                        }
                        acc[s.major].total += s.grade;
                        acc[s.major].count++;
                        return acc;
                    }, {})
                )
                    .sort(([,a], [,b]) => (b.total / b.count) - (a.total / a.count))[0][0];

                response = `### Academic Performance Metrics

**Grade Overview**
* Highest Grade: ${highestGrade}%
* Lowest Grade: ${lowestGrade}%
* Class Average: ${avgGrade}%

**Performance by Major**
${majorPerformance}

**Top Performers**
* Number of Students Above 90%: ${topPerformers}
* Best Performing Major: ${bestMajor}`;
                break;
            }

            default:
                return json({ response: "Invalid query type" });
        }

        return json({ response });
    }

    // If not a predefined query or type not provided, use the AI model
    const aiResponse = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: 'deepseek-r1:1.5b',
            prompt: `Given this student data: ${JSON.stringify(data)}\n\nQuestion: ${question}\n\nProvide a specific answer based on the data.`,
            stream: false
        })
    });

    const result = await aiResponse.json();
    return json({ response: result.response });
};

export const GET: RequestHandler = async () => {
    const data = await db.select().from(student);
    
    const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: 'deepseek-r1:1.5b',
            prompt: `Analyze this student data and provide insights about enrollment trends, grade distributions, and popular majors: ${JSON.stringify(data)}`,
            stream: false
        })
    });

    const result = await response.json();
    return json({ response: result.response });
};

