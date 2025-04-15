<script lang="ts">
    import { onMount } from 'svelte';
    import { fade, slide } from 'svelte/transition';
    import Chart from 'chart.js/auto';

    interface Student {
        id: number;
        firstName: string;
        lastName: string;
        email: string;
        major: string;
        enrollmentDate: string;
        gender: string;
        age: number;
    }

    interface Grade {
        studentId: number;
        grade: number;
    }

    interface GPAResult {
        gpa: number;
        letter: string;
    }

    const GPA_SCALE = [
        { min: 97, max: 100, gpa: 4.0, letter: 'A+' },
        { min: 93, max: 96, gpa: 4.0, letter: 'A' },
        { min: 90, max: 92, gpa: 3.7, letter: 'A-' },
        { min: 87, max: 89, gpa: 3.3, letter: 'B+' },
        { min: 83, max: 86, gpa: 3.0, letter: 'B' },
        { min: 80, max: 82, gpa: 2.7, letter: 'B-' },
        { min: 77, max: 79, gpa: 2.3, letter: 'C+' },
        { min: 73, max: 76, gpa: 2.0, letter: 'C' },
        { min: 70, max: 72, gpa: 1.7, letter: 'C-' },
        { min: 67, max: 69, gpa: 1.3, letter: 'D+' },
        { min: 65, max: 66, gpa: 1.0, letter: 'D' },
        { min: 0, max: 64, gpa: 0.0, letter: 'F' }
    ];

    let students: Student[] = [];
    let grades: Grade[] = [];
    let showChatbot = false;
    let summary = '';
    let formData = {
        firstName: '',
        lastName: '',
        email: '',
        grade: '',
        major: '',
        enrollmentDate: ''
    };
    let genderChart: Chart;
    let majorChart: Chart;
    let gradeChart: Chart;

    async function loadStudents() {
        const [studentsResponse, gradesResponse] = await Promise.all([
            fetch('/api/students'),
            fetch('/api/grades')
        ]);
        
        const studentsData = await studentsResponse.json();
        const gradesData = await gradesResponse.json();
        
        students = studentsData.data;
        grades = gradesData.data;
        
        createCharts();
    }

    async function getSummary() {
        const response = await fetch('/api/summary');
        const data = await response.json();
        summary = data.response;
    }

    async function handleSubmit() {
        await fetch('/api/students', {
            method: 'POST',
            body: JSON.stringify(formData),
            headers: { 'Content-Type': 'application/json' }
        });
        await loadStudents();
        formData = {
            firstName: '',
            lastName: '',
            email: '',
            grade: '',
            major: '',
            enrollmentDate: ''
        };
    }

    async function deleteStudent(id: number) {
        await fetch('/api/students', {
            method: 'DELETE',
            body: JSON.stringify({ id }),
            headers: { 'Content-Type': 'application/json' }
        });
        await loadStudents();
    }

    function getGPAInfo(grade: number) {
        const gpaInfo = GPA_SCALE.find(scale => grade >= scale.min && grade <= scale.max);
        return gpaInfo || { gpa: 0, letter: 'F' };
    }

    function calculateStudentGPA(studentId: number): GPAResult {
        if (!grades) return { gpa: 0, letter: 'N/A' };
        
        const studentGrades = grades.filter(g => g.studentId === studentId);
        if (studentGrades.length === 0) return { gpa: 0, letter: 'N/A' };

        const totalGPA = studentGrades.reduce((acc, { grade }) => {
            return acc + getGPAInfo(grade).gpa;
        }, 0);

        const avgGPA = Number((totalGPA / studentGrades.length).toFixed(2));
        const letter = GPA_SCALE.find(scale => avgGPA >= scale.gpa)?.letter || 'F';

        return { gpa: avgGPA, letter };
    }

    function createCharts() {
        // Gender distribution pie chart
        const genderData = students.reduce((acc: Record<string, number>, student) => {
            acc[student.gender] = (acc[student.gender] || 0) + 1;
            return acc;
        }, {});

        const genderCtx = document.getElementById('genderChart') as HTMLCanvasElement;
        if (genderChart) genderChart.destroy();
        genderChart = new Chart(genderCtx, {
            type: 'pie',
            data: {
                labels: Object.keys(genderData),
                datasets: [{
                    data: Object.values(genderData),
                    backgroundColor: [getComputedStyle(document.documentElement).getPropertyValue('--primary-color')]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Gender Distribution',
                        color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary')
                    },
                    legend: {
                        labels: {
                            color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary')
                        }
                    }
                }
            }
        });

        // Major distribution line chart
        const majorData = students.reduce((acc: Record<string, number>, student) => {
            acc[student.major] = (acc[student.major] || 0) + 1;
            return acc;
        }, {});

        const majorCtx = document.getElementById('majorChart') as HTMLCanvasElement;
        if (majorChart) majorChart.destroy();
        majorChart = new Chart(majorCtx, {
            type: 'line',
            data: {
                labels: Object.keys(majorData),
                datasets: [{
                    label: 'Students per Major',
                    data: Object.values(majorData),
                    borderColor: getComputedStyle(document.documentElement).getPropertyValue('--primary-color'),
                    backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--hover-color'),
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Students per Major',
                        color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary')
                    },
                    legend: {
                        labels: {
                            color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary')
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary')
                        },
                        grid: {
                            color: getComputedStyle(document.documentElement).getPropertyValue('--border-color')
                        }
                    },
                    y: {
                        ticks: {
                            color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary')
                        },
                        grid: {
                            color: getComputedStyle(document.documentElement).getPropertyValue('--border-color')
                        }
                    }
                }
            }
        });

        // GPA distribution horizontal bar chart
        const gpaRanges = {
            '4.0': students.filter(s => calculateStudentGPA(s.id).gpa === 4.0).length,
            '3.7-3.9': students.filter(s => {
                const gpa = calculateStudentGPA(s.id).gpa;
                return gpa >= 3.7 && gpa < 4.0;
            }).length,
            '3.3-3.6': students.filter(s => {
                const gpa = calculateStudentGPA(s.id).gpa;
                return gpa >= 3.3 && gpa < 3.7;
            }).length,
            '3.0-3.2': students.filter(s => {
                const gpa = calculateStudentGPA(s.id).gpa;
                return gpa >= 3.0 && gpa < 3.3;
            }).length,
            '2.7-2.9': students.filter(s => {
                const gpa = calculateStudentGPA(s.id).gpa;
                return gpa >= 2.7 && gpa < 3.0;
            }).length,
            '2.3-2.6': students.filter(s => {
                const gpa = calculateStudentGPA(s.id).gpa;
                return gpa >= 2.3 && gpa < 2.7;
            }).length,
            '2.0-2.2': students.filter(s => {
                const gpa = calculateStudentGPA(s.id).gpa;
                return gpa >= 2.0 && gpa < 2.3;
            }).length,
            'Below 2.0': students.filter(s => calculateStudentGPA(s.id).gpa < 2.0).length
        };

        const gradeCtx = document.getElementById('gradeChart') as HTMLCanvasElement;
        if (gradeChart) gradeChart.destroy();
        gradeChart = new Chart(gradeCtx, {
            type: 'bar',
            data: {
                labels: Object.keys(gpaRanges),
                datasets: [{
                    label: 'Number of Students',
                    data: Object.values(gpaRanges),
                    backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--primary-color'),
                    borderRadius: 4
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'GPA Distribution',
                        color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary')
                    },
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1,
                            color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary')
                        },
                        grid: {
                            color: getComputedStyle(document.documentElement).getPropertyValue('--border-color')
                        }
                    },
                    y: {
                        ticks: {
                            color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary')
                        },
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }

    $: averageGPA = students.length > 0 
        ? Number((students.reduce((acc, s) => acc + calculateStudentGPA(s.id).gpa, 0) / students.length).toFixed(2))
        : 0;

    onMount(() => {
        loadStudents();
        
        // Create an observer to watch for theme changes
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'class' || mutation.attributeName === 'style') {
                    createCharts();
                }
            });
        });

        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class', 'style']
        });

        return () => observer.disconnect();
    });
</script>

<div class="dashboard">
    <header class="welcome-banner">
        <div class="welcome-content">
            <h1>Welcome to Student Dashboard</h1>
            <p>Track and analyze student performance</p>
        </div>
        <div class="welcome-graphics">
            <i class="fas fa-graduation-cap"></i>
        </div>
    </header>

    <div class="stats-grid">
        <div class="stat-card">
            <div class="stat-icon">
                <i class="fas fa-users"></i>
            </div>
            <div class="stat-content">
                <h3>Total Students</h3>
                <p class="stat-value">{students.length}</p>
            </div>
        </div>
        
        <div class="stat-card">
            <div class="stat-icon">
                <i class="fas fa-chart-line"></i>
            </div>
            <div class="stat-content">
                <h3>Average GPA</h3>
                <p class="stat-value">{averageGPA}</p>
            </div>
        </div>

        <div class="stat-card">
            <div class="stat-icon">
                <i class="fas fa-book"></i>
            </div>
            <div class="stat-content">
                <h3>Total Majors</h3>
                <p class="stat-value">
                    {new Set(students.map(s => s.major)).size}
                </p>
            </div>
        </div>
    </div>

    <div class="charts-grid">
        
        <div class="chart-card pie-chart">
            <div class="chart-header">
                <h2>Gender Distribution</h2>
            </div>
            <div class="chart-body">
                <canvas id="genderChart"></canvas>
            </div>
        </div>

     
        <div class="chart-card line-chart">
            <div class="chart-header">
                <h2>Students per Major</h2>
            </div>
            <div class="chart-body">
                <canvas id="majorChart"></canvas>
            </div>
        </div>

   
        <div class="chart-card full-width">
            <div class="chart-header">
                <h2>GPA Distribution</h2>
            </div>
            <div class="chart-body">
                <canvas id="gradeChart"></canvas>
            </div>
        </div>
    </div>
</div>

<style>
    .dashboard {
        padding: 2rem;
        max-width: 1400px;
        margin: 0 auto;
    }

    .welcome-banner {
        background: linear-gradient(135deg, var(--primary-hover) 0%, var(--primary-dark) 100%);
        border-radius: 1rem;
        padding: 2rem;
        color: white;
        margin-bottom: 2rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
        transition: background 0.3s;
    }

    .welcome-content h1 {
        font-size: 1.875rem;
        font-weight: 600;
        margin-bottom: 0.5rem;
    }

    .welcome-content p {
        font-size: 1.125rem;
        opacity: 0.9;
    }

    .welcome-graphics i {
        font-size: 3rem;
        opacity: 0.9;
    }

    .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 1.5rem;
        margin-bottom: 2rem;
    }

    .stat-card {
        background: var(--card-background);
        border-radius: 1rem;
        padding: 1.5rem;
        display: flex;
        align-items: center;
        gap: 1rem;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        transition: background-color 0.3s;
    }

    .stat-icon {
        background: var(--background-color);
        width: 3rem;
        height: 3rem;
        border-radius: 0.75rem;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background-color 0.3s;
    }

    .stat-icon i {
        font-size: 1.25rem;
        color: var(--primary-color);
        transition: color 0.3s;
    }

    .stat-content h3 {
        font-size: 0.875rem;
        color: var(--text-secondary);
        margin-bottom: 0.25rem;
        transition: color 0.3s;
    }

    .stat-value {
        font-size: 1.5rem;
        font-weight: 600;
        color: var(--text-primary);
        transition: color 0.3s;
    }

    .charts-grid {
        display: grid;
        grid-template-columns: 300px 1fr;
        gap: 1.5rem;
    }

    .chart-card {
        background: var(--card-background);
        border-radius: 1rem;
        overflow: hidden;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        transition: background-color 0.3s;
    }

    .chart-card.full-width {
        grid-column: 1 / -1;
    }

    .chart-card.pie-chart {
        width: 300px;
    }

    .chart-card.pie-chart .chart-body {
        min-height: 250px;
        padding: 1rem;
    }

    .chart-card.line-chart {
        width: 100%;
    }

    .chart-card.line-chart .chart-body {
        min-height: 250px;
        padding: 1rem;
    }

    .chart-header {
        padding: 1.25rem;
        border-bottom: 1px solid var(--border-color);
        transition: border-color 0.3s;
    }

    .chart-header h2 {
        font-size: 1.125rem;
        font-weight: 600;
        color: var(--text-primary);
        transition: color 0.3s;
    }

    .chart-body {
        padding: 1.25rem;
        min-height: 300px;
    }

    @media (max-width: 768px) {
        .charts-grid {
            grid-template-columns: 1fr;
        }

        .chart-card.full-width {
            grid-column: auto;
        }
    }
</style>
