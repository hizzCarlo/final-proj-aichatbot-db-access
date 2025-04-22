import { db } from "$lib/server/db";
import { student, studentGrade, subject } from "$lib/server/db/schema";
import type { InferSelectModel } from "drizzle-orm";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from './$types';
import type { Student } from '$lib/types';

type DbStudentGrade = InferSelectModel<typeof studentGrade>;
type DbSubject = InferSelectModel<typeof subject>;

interface GPAResult {
    gpa: number;
    letter: string;
}

interface LocalGrade {
    id: number;
    studentId: number;
    subjectId: number;
    grade: number;
}

interface StudentGPAInfo {
    id: number;
    gpa: number;
    major: string;
}

const GPA_SCALE = [
    { min: 93, max: 100, gpa: 4.0, letter: 'A' },
    { min: 90, max: 92, gpa: 3.7, letter: 'A-' },
    { min: 87, max: 89, gpa: 3.3, letter: 'B+' },
    { min: 83, max: 86, gpa: 3.0, letter: 'B' },
    { min: 80, max: 82, gpa: 2.7, letter: 'B-' },
    { min: 77, max: 79, gpa: 2.3, letter: 'C+' },
    { min: 73, max: 76, gpa: 2.0, letter: 'C' },
    { min: 70, max: 72, gpa: 1.7, letter: 'C-' },
    { min: 67, max: 69, gpa: 1.3, letter: 'D+' },
    { min: 63, max: 66, gpa: 1.0, letter: 'D' },
    { min: 60, max: 62, gpa: 0.7, letter: 'D-' },
    { min: 0, max: 59, gpa: 0.0, letter: 'F' }
] as const;

function getGPAInfo(grade: number): GPAResult {
    const scale = GPA_SCALE.find(s => grade >= s.min && grade <= s.max);
    return scale ? { gpa: scale.gpa, letter: scale.letter } : { gpa: 0, letter: 'F' };
}

function calculateStudentGPA(studentGrades: DbStudentGrade[]): GPAResult {
    if (studentGrades.length === 0) return { gpa: 0, letter: 'N/A' };

    const totalGPA = studentGrades.reduce((acc, grade) => {
        const numericGrade = typeof grade.grade === 'string' ? parseInt(grade.grade) : grade.grade;
        return acc + getGPAInfo(numericGrade).gpa;
    }, 0);

    const avgGPA = Number((totalGPA / studentGrades.length).toFixed(2));
    const letter = GPA_SCALE.find(scale => avgGPA >= scale.gpa)?.letter || 'F';

    return { gpa: avgGPA, letter };
}

async function queryAI(prompt: string): Promise<string> {
    try {
        const aiResponse = await fetch('http://localhost:11434/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'deepseek-r1',
                prompt: prompt,
                stream: false,
                options: {
                    temperature: 0.7,
                    num_predict: 1024,
                    top_k: 40,
                    top_p: 0.9,
                    repeat_last_n: 64,
                    repeat_penalty: 1.1
                }
            })
        });

        if (!aiResponse.ok) {
            throw new Error('Failed to get AI response');
        }

        const result = await aiResponse.json();
        return result.response;
    } catch (error) {
        console.error('AI Query Error:', error);
        throw new Error('Failed to get AI response');
    }
}

export const POST: RequestHandler = async ({ request }) => {
    try {
    const { question, type } = await request.json();
        const [studentsData, gradesData, subjectsData] = await Promise.all([
            db.select().from(student),
            db.select().from(studentGrade),
            db.select().from(subject)
        ]);

        // Common calculations
        const maleCount = studentsData.filter(s => s.gender === 'Male').length;
        const femaleCount = studentsData.filter(s => s.gender === 'Female').length;
        const uniqueMajors = [...new Set(studentsData.map(s => s.major))];
        const avgAge = Math.round(studentsData.reduce((acc, s) => acc + (s.age || 0), 0) / studentsData.length);
        const ages = studentsData.map(s => s.age || 0);
        const minAge = Math.min(...ages);
        const maxAge = Math.max(...ages);

        // Calculate GPAs
        const studentGPAs: StudentGPAInfo[] = studentsData.map(student => {
            const studentGrades = gradesData.filter(g => g.studentId === student.id);
            const gpaResult = calculateStudentGPA(studentGrades);
            return {
                id: student.id,
                gpa: gpaResult.gpa,
                major: student.major
            };
        });

        const avgGPA = studentGPAs.length > 0 
            ? Number((studentGPAs.reduce((acc, curr) => acc + curr.gpa, 0) / studentGPAs.length).toFixed(2))
            : 0;

        const gpaRanges = {
            '4.0': studentGPAs.filter(s => s.gpa === 4.0).length,
            '3.7-3.9': studentGPAs.filter(s => s.gpa >= 3.7 && s.gpa < 4.0).length,
            '3.3-3.6': studentGPAs.filter(s => s.gpa >= 3.3 && s.gpa < 3.7).length,
            '3.0-3.2': studentGPAs.filter(s => s.gpa >= 3.0 && s.gpa < 3.3).length,
            '2.7-2.9': studentGPAs.filter(s => s.gpa >= 2.7 && s.gpa < 3.0).length,
            '2.3-2.6': studentGPAs.filter(s => s.gpa >= 2.3 && s.gpa < 2.7).length,
            '2.0-2.2': studentGPAs.filter(s => s.gpa >= 2.0 && s.gpa < 2.3).length,
            'Below 2.0': studentGPAs.filter(s => s.gpa < 2.0).length
        };

        // Handle predefined queries
        if (type && type !== 'custom') {
            let response: string;

        switch (type) {
            case "summary": {
                    const majorStats = uniqueMajors.map(major => {
                        const studentsInMajor = studentGPAs.filter(s => s.major === major);
                        const avgMajorGPA = studentsInMajor.length > 0
                            ? Number((studentsInMajor.reduce((a, b) => a + b.gpa, 0) / studentsInMajor.length).toFixed(2))
                            : 0;
                        return `* ${major}: ${studentsInMajor.length} students (Avg GPA: ${avgMajorGPA})`;
                    }).join('\n');

                    // Get detailed student information including grades
                    const detailedStudentInfo = studentsData.map(student => {
                        const studentGrades = gradesData.filter(g => g.studentId === student.id);
                        const subjectGrades = studentGrades.map(grade => {
                            const subjectInfo = subjectsData.find(s => s.id === grade.subjectId);
                            return `  - ${subjectInfo?.name}: ${grade.grade} (${getGPAInfo(Number(grade.grade)).letter})`;
                        }).join('\n');

                        const gpaInfo = calculateStudentGPA(studentGrades);
                        return `* ${student.firstName} ${student.lastName}:
  Enrollment Date: ${student.enrollmentDate}
  Major: ${student.major}
  Current GPA: ${gpaInfo.gpa} (${gpaInfo.letter})
  Grades:\n${subjectGrades}`;
                    }).join('\n\n');

                response = `### Student Data Overview

**Total Students**: ${studentsData.length}
**Gender Distribution**:
* Male Students: ${maleCount}
* Female Students: ${femaleCount}

### Academic Performance
**Overall GPA**: ${avgGPA}
**GPA Distribution**:
* 4.0: ${gpaRanges['4.0']} students (Perfect GPA)
* 3.7-3.9: ${gpaRanges['3.7-3.9']} students (Excellent)
* 3.3-3.6: ${gpaRanges['3.3-3.6']} students (Very Good)
* 3.0-3.2: ${gpaRanges['3.0-3.2']} students (Good)
* 2.7-2.9: ${gpaRanges['2.7-2.9']} students (Satisfactory)
* 2.3-2.6: ${gpaRanges['2.3-2.6']} students (Fair)
* 2.0-2.2: ${gpaRanges['2.0-2.2']} students (Poor)
* Below 2.0: ${gpaRanges['Below 2.0']} students (At Risk)

### Major Distribution
**Total Majors**: ${uniqueMajors.length}
**Major Statistics**:
${majorStats}

### Demographics
* Average Age: ${avgAge} years
* Age Range: ${minAge} - ${maxAge} years

### Detailed Student Information
${detailedStudentInfo}`;
                break;
            }

            case "enrollment": {
                    // Parse enrollment dates and group by year and semester
                    const enrollmentTrends = studentsData.reduce((acc, student) => {
                        const [year, semester] = student.enrollmentDate.split(' ');
                        if (!acc[year]) {
                            acc[year] = { Spring: 0, Fall: 0, total: 0 };
                        }
                        acc[year][semester as 'Spring' | 'Fall']++;
                        acc[year].total++;
                        return acc;
                    }, {} as Record<string, { Spring: number; Fall: number; total: number }>);

                    // Calculate year-over-year growth
                    const years = Object.keys(enrollmentTrends).sort();
                    const yearOverYearGrowth = years.map((year, index) => {
                        if (index === 0) return null;
                        const currentYear = enrollmentTrends[year].total;
                        const previousYear = enrollmentTrends[years[index - 1]].total;
                        const growth = ((currentYear - previousYear) / previousYear * 100).toFixed(1);
                        return { year, growth };
                    }).filter(item => item !== null);

                    // Get major trends
                    const majorTrends = uniqueMajors.map(major => {
                        const trendByYear = years.map(year => {
                            const studentsInYear = studentsData.filter(s => 
                                s.enrollmentDate.startsWith(year) && s.major === major
                ).length;
                            return { year, count: studentsInYear };
                        });

                        const growth = trendByYear.length > 1 ? 
                            ((trendByYear[trendByYear.length - 1].count - trendByYear[0].count) / trendByYear[0].count * 100).toFixed(1) : '0';

                        return `* ${major}:
  - Current Year Enrollments: ${trendByYear[trendByYear.length - 1].count}
  - Overall Growth: ${growth}%
  - Trend: ${trendByYear.map(t => `${t.year}: ${t.count}`).join(' → ')}`;
                    }).join('\n\n');

                    response = `### Enrollment Trends Analysis

**Overall Enrollment by Year**:
${years.map(year => 
    `* ${year}:
  - Total: ${enrollmentTrends[year].total} students
  - Spring: ${enrollmentTrends[year].Spring} students
  - Fall: ${enrollmentTrends[year].Fall} students`
).join('\n')}

**Year-over-Year Growth**:
${yearOverYearGrowth.map(item => 
    `* ${item?.year}: ${item?.growth}% growth from previous year`
).join('\n')}

**Major Enrollment Trends**:
${majorTrends}

**Current Semester Insights**:
* Most Popular Major: ${uniqueMajors.reduce((a, b) => 
    studentsData.filter(s => s.major === b).length > 
    studentsData.filter(s => s.major === a).length ? b : a
)}
* Fastest Growing Major: ${uniqueMajors.reduce((a, b) => {
    const aGrowth = studentsData.filter(s => s.major === a && 
        s.enrollmentDate.startsWith(years[years.length - 1])).length;
    const bGrowth = studentsData.filter(s => s.major === b && 
        s.enrollmentDate.startsWith(years[years.length - 1])).length;
    return bGrowth > aGrowth ? b : a;
})}`;
                break;
            }

            case "performance": {
                    const majorPerformance = uniqueMajors.map(major => {
                        const studentsInMajor = studentGPAs.filter(s => s.major === major);
                        const avgMajorGPA = studentsInMajor.length > 0
                            ? Number((studentsInMajor.reduce((a, b) => a + b.gpa, 0) / studentsInMajor.length).toFixed(2))
                            : 0;
                        
                        const excellentStudents = studentsInMajor.filter(s => s.gpa >= 3.7).length;
                        const atRiskStudents = studentsInMajor.filter(s => s.gpa < 2.0).length;

                        return `* ${major}:
  - Average GPA: ${avgMajorGPA}
  - Total Students: ${studentsInMajor.length}
  - Excellent Performers (GPA ≥ 3.7): ${excellentStudents}
  - At Risk Students (GPA < 2.0): ${atRiskStudents}`;
                    }).join('\n\n');

                    const topPerformers = studentGPAs.filter(s => s.gpa >= 3.7).length;
                    const bestMajor = uniqueMajors.reduce((best, major) => {
                        const studentsInMajor = studentGPAs.filter(s => s.major === major);
                        const avgMajorGPA = studentsInMajor.length > 0
                            ? Number((studentsInMajor.reduce((a, b) => a + b.gpa, 0) / studentsInMajor.length).toFixed(2))
                            : 0;

                        return avgMajorGPA > best.gpa ? { major, gpa: avgMajorGPA } : best;
                    }, { major: '', gpa: 0 });

                    response = `### Academic Performance Analysis

**Overall Performance**
* Average GPA: ${avgGPA}
* Students with Excellent Performance (GPA ≥ 3.7): ${topPerformers}
* Best Performing Major: ${bestMajor.major} (${bestMajor.gpa} GPA)

**Performance by Major**
${majorPerformance}

**GPA Distribution Overview**
* Perfect GPA (4.0): ${gpaRanges['4.0']} students
* Excellent (3.7-3.9): ${gpaRanges['3.7-3.9']} students
* Very Good (3.3-3.6): ${gpaRanges['3.3-3.6']} students
* Good (3.0-3.2): ${gpaRanges['3.0-3.2']} students
* Below Expectations: ${gpaRanges['2.7-2.9'] + gpaRanges['2.3-2.6'] + gpaRanges['2.0-2.2'] + gpaRanges['Below 2.0']} students`;
                break;
            }

            default:
                return json({ response: "Invalid query type" });
        }

        return json({ response });
    }

        // For custom queries, use the AI model with the database information as context
        const prompt = `You are an AI assistant analyzing student database information. Use ONLY the following data to answer the question:

Database Statistics:
- Total Students: ${studentsData.length}
- Gender Distribution: ${maleCount} Male, ${femaleCount} Female
- Average GPA: ${avgGPA}
- Total Majors: ${uniqueMajors.length}
- Majors: ${uniqueMajors.join(', ')}
- Age Range: ${minAge}-${maxAge} years
- Average Age: ${avgAge}
- GPA Distribution: ${JSON.stringify(gpaRanges, null, 2)}

Question: ${question}

Please provide a specific, accurate answer based ONLY on the above data. Format your response in markdown with appropriate headers and bullet points. Do not make assumptions beyond what is shown in the data.`;

        const response = await queryAI(prompt);
        if (response) {
            const cleanResponse = response
                .replace(/<think>[\s\S]*?<\/think>/g, '')
                .replace(/\[INST\][\s\S]*?\[\/INST\]/g, '')
                .replace(/\[ASSISTANT\][\s\S]*?\[\/ASSISTANT\]/g, '')
                .trim()
                .replace(/##\s*(.*?)\s*##/g, '### $1')
                .replace(/\*\*\s*(.*?)\s*\*\*/g, '**$1**')
                .split('###')
                .map((section: string) => section.trim())
                .filter(Boolean)
                .join('\n\n### ');

            return json({ response: cleanResponse });
        } else {
            throw new Error('Invalid response format');
        }
    } catch (error) {
        console.error('Summary API Error:', error);
        return json({ error: 'Failed to process request' }, { status: 500 });
    }
};

export const GET: RequestHandler = async () => {
    try {
        // Fetch all data from the database
        const studentsData: Student[] = await db.all('SELECT * FROM students');
        const gradesData: LocalGrade[] = await db.all('SELECT * FROM grades');
        const subjectsData: DbSubject[] = await db.all('SELECT * FROM subjects');

        // Calculate average GPA
        const totalGPA = gradesData.reduce((sum, grade) => sum + grade.grade, 0);
        const averageGPA = totalGPA / gradesData.length;

        // Get total number of students
        const totalStudents = studentsData.length;

        // Get total number of subjects
        const totalSubjects = subjectsData.length;

        // Calculate grade distribution
        const gradeDistribution = gradesData.reduce((acc: Record<number, number>, grade) => {
            acc[grade.grade] = (acc[grade.grade] || 0) + 1;
            return acc;
        }, {});

        return json({
            averageGPA,
            totalStudents,
            totalSubjects,
            gradeDistribution
        });
    } catch (error) {
        console.error('Error fetching summary data:', error);
        return json({ error: 'Failed to fetch summary data' }, { status: 500 });
    }
};

