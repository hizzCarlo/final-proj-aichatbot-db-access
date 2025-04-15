<script lang="ts">
    import { onMount } from 'svelte';
    import { fade, slide } from 'svelte/transition';
    import { Chart } from 'chart.js/auto';
    import StudentGrades from '../../components/StudentGrades.svelte';

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
    let editingStudent: Student | null = null;
    let showSummaryModal = false;
    let isSummarizing = false;
    let summaryData: any = null;
    let predictionChart: Chart | null = null;
    let performanceChart: Chart | null = null;
    let isInitialLoad = true;
    let formData = {
        firstName: '',
        lastName: '',
        email: '',
        major: '',
        enrollmentDate: '',
        gender: '',
        age: ''
    };

    const genderOptions = ['Male', 'Female'];

    interface SummaryData {
        overview: string;
        predictions: {
            enrollmentTrend: number[];
            performanceTrend: number[];
            labels: string[];
        };
        aiInsights: string;
    }

    function getGPAInfo(grade: number) {
        const gpaInfo = GPA_SCALE.find(scale => grade >= scale.min && grade <= scale.max);
        return gpaInfo || { gpa: 0, letter: 'F' };
    }

    function calculateStudentGPA(studentId: number): { gpa: number; letter: string } {
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

    async function loadData() {
        try {
            const [studentsResponse, gradesResponse] = await Promise.all([
                fetch('/api/students'),
                fetch('/api/grades')
            ]);

            const studentsData = await studentsResponse.json();
            const gradesData = await gradesResponse.json();

            students = studentsData.data;
            grades = gradesData.data || [];
        } catch (error) {
            console.error('Error loading data:', error);
            students = [];
            grades = [];
        }
    }

    async function getSummary() {
        const response = await fetch('/api/summary');
        const data = await response.json();
        summary = data.response;
    }

    function startEdit(student: Student) {
        editingStudent = student;
        formData = {
            firstName: student.firstName,
            lastName: student.lastName,
            email: student.email,
            major: student.major,
            enrollmentDate: student.enrollmentDate,
            gender: student.gender,
            age: student.age.toString()
        };
    }

    function cancelEdit() {
        editingStudent = null;
        resetForm();
    }

    function resetForm() {
        formData = {
            firstName: '',
            lastName: '',
            email: '',
            major: '',
            enrollmentDate: '',
            gender: '',
            age: ''
        };
    }

    async function handleSubmit() {
        const studentData = {
            ...formData,
            age: parseInt(formData.age),
            major: formData.major.toUpperCase()
        };

        if (editingStudent) {
            await fetch('/api/students', {
                method: 'PUT',
                body: JSON.stringify({ id: editingStudent.id, ...studentData }),
                headers: { 'Content-Type': 'application/json' }
            });
            editingStudent = null;
        } else {
            await fetch('/api/students', {
                method: 'POST',
                body: JSON.stringify(studentData),
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        await loadData();
        resetForm();
    }

    async function deleteStudent(id: number) {
        if (confirm('Are you sure you want to delete this student?')) {
            await fetch('/api/students', {
                method: 'DELETE',
                body: JSON.stringify({ id }),
                headers: { 'Content-Type': 'application/json' }
            });
            await loadData();
        }
    }

    // Watch for modal visibility changes
    $: if (showSummaryModal && summaryData) {
        // Use requestAnimationFrame to ensure DOM is ready
        requestAnimationFrame(() => {
            createPredictionCharts();
        });
    }

    async function generateSummary() {
        if (isSummarizing) return;
        
        // Show modal immediately with existing data or loading state
        showSummaryModal = true;
        
        // If we already have data or are already loading, don't fetch again
        if (summaryData || isSummarizing) return;
        
        isSummarizing = true;
        isInitialLoad = false;

        try {
            // Get predefined summary
            const summaryResponse = await fetch('/api/summary', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    type: 'summary',
                    question: 'Give me a complete summary of all student data'
                })
            });
            const summaryResult = await summaryResponse.json();

            // Get AI insights
            const insightResponse = await fetch('/api/summary', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    question: 'Based on the current data, provide insights about future enrollment trends, potential areas of improvement, and recommendations for academic performance enhancement.'
                })
            });
            const insightResult = await insightResponse.json();

            // Generate mock prediction data (in a real app, this would come from a ML model)
            const predictions = {
                enrollmentTrend: [65, 72, 78, 82, 88, 92],
                performanceTrend: [75, 78, 80, 82, 85, 87],
                labels: ['Current', '+1 Month', '+2 Months', '+3 Months', '+4 Months', '+5 Months']
            };

            summaryData = {
                overview: summaryResult.response,
                predictions,
                aiInsights: insightResult.response
            };

        } catch (error) {
            console.error('Error generating summary:', error);
        } finally {
            isSummarizing = false;
        }
    }

    function clearSummary() {
        summaryData = null;
        if (predictionChart) {
            predictionChart.destroy();
            predictionChart = null;
        }
        if (performanceChart) {
            performanceChart.destroy();
            performanceChart = null;
        }
    }

    function createPredictionCharts() {
        // Destroy existing charts first
        if (predictionChart) {
            predictionChart.destroy();
            predictionChart = null;
        }
        if (performanceChart) {
            performanceChart.destroy();
            performanceChart = null;
        }

        if (!summaryData) return;

        const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary-color');
        const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-primary');
        const borderColor = getComputedStyle(document.documentElement).getPropertyValue('--border-color');

        // Enrollment Prediction Chart
        const enrollmentCtx = document.getElementById('enrollmentPredictionChart') as HTMLCanvasElement;
        if (!enrollmentCtx) return; // Exit if canvas element isn't ready

        predictionChart = new Chart(enrollmentCtx, {
            type: 'line',
            data: {
                labels: summaryData.predictions.labels,
                datasets: [{
                    label: 'Predicted Enrollment',
                    data: summaryData.predictions.enrollmentTrend,
                    borderColor: primaryColor,
                    tension: 0.4,
                    fill: true,
                    backgroundColor: `${primaryColor}20`
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Enrollment Trend Prediction',
                        color: textColor
                    },
                    legend: {
                        labels: { color: textColor }
                    }
                },
                scales: {
                    x: {
                        grid: { color: borderColor },
                        ticks: { color: textColor }
                    },
                    y: {
                        grid: { color: borderColor },
                        ticks: { color: textColor }
                    }
                }
            }
        });

        // Performance Prediction Chart
        const performanceCtx = document.getElementById('performancePredictionChart') as HTMLCanvasElement;
        if (!performanceCtx) return; // Exit if canvas element isn't ready

        performanceChart = new Chart(performanceCtx, {
            type: 'line',
            data: {
                labels: summaryData.predictions.labels,
                datasets: [{
                    label: 'Predicted Average Performance',
                    data: summaryData.predictions.performanceTrend,
                    borderColor: primaryColor,
                    tension: 0.4,
                    fill: true,
                    backgroundColor: `${primaryColor}20`
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Performance Trend Prediction',
                        color: textColor
                    },
                    legend: {
                        labels: { color: textColor }
                    }
                },
                scales: {
                    x: {
                        grid: { color: borderColor },
                        ticks: { color: textColor }
                    },
                    y: {
                        grid: { color: borderColor },
                        ticks: { color: textColor }
                    }
                }
            }
        });
    }

    onMount(loadData);
</script>

<style>
    :global(.dark) .text-gray-900 {
        color: #ffffff;
    }

    :global(.dark) .text-gray-500 {
        color: #9ca3af;
    }

    :global(.dark) .card-header h2 {
        color: #ffffff;
    }

    :global(.dark) .form-label {
        color: #e5e7eb;
    }

    :global(.dark) .text-3xl {
        color: #ffffff;
    }
    .student-header h1 {
        font-size: 2rem;
        font-weight: 600;
        color: var(--primary-color, #6366f1);
        margin-bottom: 0.5rem;
    }

    .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    }

    .modal-container {
        background: var(--card-background);
        border-radius: 1rem;
        width: 90%;
        max-width: 1200px;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }

    .modal-header {
        padding: 1.5rem;
        border-bottom: 1px solid var(--border-color);
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .modal-header h2 {
        font-size: 1.5rem;
        font-weight: 600;
        color: var(--text-primary);
    }

    .modal-actions {
        display: flex;
        gap: 0.5rem;
    }

    .modal-content {
        padding: 1.5rem;
        overflow-y: auto;
        flex: 1;
    }

    .summary-section {
        margin-bottom: 2rem;
    }

    .summary-section h3 {
        font-size: 1.25rem;
        font-weight: 600;
        color: var(--primary-color);
        margin-bottom: 1rem;
    }

    .markdown-content {
        line-height: 1.6;
    }

    .markdown-content h4 {
        font-size: 1.1rem;
        font-weight: 600;
        color: var(--text-primary);
        margin: 1rem 0 0.5rem;
    }

    .markdown-content strong {
        color: var(--primary-color);
        font-weight: 600;
    }

    .charts-container {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 1.5rem;
        margin-top: 1rem;
    }

    .prediction-chart {
        background: var(--background-color);
        border-radius: 0.5rem;
        padding: 1rem;
        height: 300px;
    }

    .loading-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 3rem;
        color: var(--text-secondary);
        min-height: 300px;
    }

    .loading-spinner {
        margin-bottom: 1rem;
        color: var(--primary-color);
    }

    @keyframes bounce {
        0%, 80%, 100% { transform: scale(0); opacity: 0.3; }
        40% { transform: scale(1); opacity: 1; }
    }

    .loading-dots {
        display: flex;
        gap: 0.5rem;
        margin-top: 1rem;
    }

    .loading-dot {
        width: 0.75rem;
        height: 0.75rem;
        background-color: var(--primary-color);
        border-radius: 50%;
        animation: bounce 1.4s infinite ease-in-out both;
    }

    .loading-dot:nth-child(1) { animation-delay: -0.32s; }
    .loading-dot:nth-child(2) { animation-delay: -0.16s; }
    .loading-dot:nth-child(3) { animation-delay: 0s; }

    .btn.loading {
        opacity: 0.7;
        cursor: not-allowed;
        position: relative;
        padding-right: 4rem;
    }

    .btn.loading .loading-dots {
        position: absolute;
        right: 1rem;
        top: 50%;
        transform: translateY(-50%);
        margin: 0;
        gap: 0.25rem;
    }

    .btn.loading .loading-dot {
        width: 0.5rem;
        height: 0.5rem;
    }

    @media (max-width: 768px) {
        .modal-container {
            width: 95%;
            max-height: 95vh;
        }

        .charts-container {
            grid-template-columns: 1fr;
        }
    }

    .gpa-display {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .gpa-value {
        font-weight: 600;
        color: var(--text-primary);
    }

    .letter-grade {
        font-weight: bold;
        padding: 0.25rem 0.5rem;
        border-radius: 0.25rem;
        background: var(--primary-color);
        color: white;
        font-size: 0.875rem;
    }
</style>

<div class="container">
    <div class="flex justify-between items-center mb-6">
        <header class="student-header">
            <h1>Student Management</h1>
        </header>
        <button 
            class="btn btn-primary {isSummarizing ? 'loading' : ''}"
            on:click={generateSummary}
            disabled={isSummarizing}
        >
            <i class="fas fa-chart-bar"></i>
            Summarize Data
            {#if isSummarizing}
                <div class="loading-dots">
                    <div class="loading-dot"></div>
                    <div class="loading-dot"></div>
                    <div class="loading-dot"></div>
                </div>
            {/if}
        </button>
    </div>

    <!-- Summary Modal -->
    {#if showSummaryModal}
        <div class="modal-overlay" transition:fade>
            <div class="modal-container" transition:slide>
                <div class="modal-header">
                    <h2>Data Analysis & Insights</h2>
                    <div class="modal-actions">
                        <button class="btn btn-secondary" on:click={() => showSummaryModal = false}>
                            <i class="fas fa-times"></i>
                            Close
                        </button>
                        <button class="btn btn-danger" on:click={clearSummary}>
                            <i class="fas fa-trash"></i>
                            Clear
                        </button>
                    </div>
                </div>
                <div class="modal-content">
                    {#if summaryData}
                        <div class="summary-section">
                            <h3>Overview</h3>
                            <div class="markdown-content">
                                {@html summaryData.overview.replace(/###\s*(.*?)(?=\n|$)/g, '<h4>$1</h4>')
                                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                    .replace(/\n/g, '<br>')}
                            </div>
                        </div>

                        <div class="summary-section">
                            <h3>Predictions</h3>
                            <div class="charts-container">
                                <div class="prediction-chart">
                                    <canvas id="enrollmentPredictionChart"></canvas>
                                </div>
                                <div class="prediction-chart">
                                    <canvas id="performancePredictionChart"></canvas>
                                </div>
                            </div>
                        </div>

                        <div class="summary-section">
                            <h3>AI Insights & Recommendations</h3>
                            <div class="markdown-content">
                                {@html summaryData.aiInsights.replace(/###\s*(.*?)(?=\n|$)/g, '<h4>$1</h4>')
                                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                    .replace(/\n/g, '<br>')}
                            </div>
                        </div>
                    {:else if isSummarizing}
                        <div class="loading-container">
                            <div class="loading-spinner">
                                <i class="fas fa-chart-bar fa-3x"></i>
                            </div>
                            <p>Generating comprehensive analysis...</p>
                            <div class="loading-dots">
                                <div class="loading-dot"></div>
                                <div class="loading-dot"></div>
                                <div class="loading-dot"></div>
                            </div>
                        </div>
                    {/if}
                </div>
            </div>
        </div>
    {/if}

    <!-- Add/Edit Student Form -->
    <div class="card">
        <div class="card-header">
            <h2 class="text-xl font-bold">{editingStudent ? 'Edit Student' : 'Add New Student'}</h2>
        </div>
        <div class="card-body">
            <form on:submit|preventDefault={handleSubmit} class="form-grid">
                <div class="form-group">
                    <label for="firstName" class="form-label">First Name</label>
                    <input
                        id="firstName"
                        bind:value={formData.firstName}
                        placeholder="Enter first name"
                        class="form-input"
                        required
                    />
                </div>
                <div class="form-group">
                    <label for="lastName" class="form-label">Last Name</label>
                    <input
                        id="lastName"
                        bind:value={formData.lastName}
                        placeholder="Enter last name"
                        class="form-input"
                        required
                    />
                </div>
                <div class="form-group">
                    <label for="email" class="form-label">Email</label>
                    <input
                        id="email"
                        bind:value={formData.email}
                        type="email"
                        pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2}$"
                        placeholder="Enter email address"
                        class="form-input"
                        required
                    />
                </div>
                <div class="form-group">
                    <label for="major" class="form-label">Major</label>
                    <input
                        id="major"
                        bind:value={formData.major}
                        placeholder="Enter major"
                        class="form-input"
                        style="text-transform: uppercase;"
                        required
                    />
                </div>
                <div class="form-group">
                    <label for="gender" class="form-label">Gender</label>
                    <select
                        id="gender"
                        bind:value={formData.gender}
                        class="form-input"
                        required
                    >
                        <option value="">Select gender</option>
                        {#each genderOptions as gender}
                            <option value={gender}>{gender}</option>
                        {/each}
                    </select>
                </div>
                <div class="form-group">
                    <label for="age" class="form-label">Age</label>
                    <input
                        id="age"
                        bind:value={formData.age}
                        type="number"
                        min="16"
                        max="100"
                        placeholder="Enter age"
                        class="form-input"
                        required
                    />
                </div>
                <div class="form-group">
                    <label for="enrollmentDate" class="form-label">Enrollment Date</label>
                    <input
                        id="enrollmentDate"
                        bind:value={formData.enrollmentDate}
                        type="date"
                        class="form-input"
                        required
                    />
                </div>
                <div class="form-group w-full flex justify-between">
                    <button type="submit" class="btn btn-primary">
                        <i class="fas {editingStudent ? 'fa-save' : 'fa-plus'}"></i>
                        {editingStudent ? 'Update Student' : 'Add Student'}
                    </button>
                    {#if editingStudent}
                        <button type="button" class="btn btn-secondary" on:click={cancelEdit}>
                            <i class="fas fa-times"></i>
                            Cancel
                        </button>
                    {/if}
                </div>
            </form>
        </div>
    </div>

    <!-- Add the grades component when editing a student -->
    {#if editingStudent}
        <StudentGrades studentId={editingStudent.id} />
    {/if}

    <div class="card">
        <div class="card-header">
            <h2 class="text-xl font-bold">Student List</h2>
        </div>
        <div class="table-container">
            <table class="table">
                <thead>
                    <tr>
                        <th>NAME</th>
                        <th>EMAIL</th>
                        <th>MAJOR</th>
                        <th>GENDER</th>
                        <th>AGE</th>
                        <th>GPA</th>
                        <th>ENROLLMENT DATE</th>
                        <th>ACTIONS</th>
                    </tr>
                </thead>
                <tbody>
                    {#each students as student}
                        {@const gpaInfo = calculateStudentGPA(student.id)}
                        <tr>
                            <td>{student.firstName} {student.lastName}</td>
                            <td>{student.email}</td>
                            <td>{student.major}</td>
                            <td>{student.gender}</td>
                            <td>{student.age}</td>
                            <td>
                                <div class="gpa-display">
                                    <span class="gpa-value">{gpaInfo.gpa}</span>
                                    <span class="letter-grade">{gpaInfo.letter}</span>
                                </div>
                            </td>
                            <td>{student.enrollmentDate}</td>
                            <td>
                                <div class="flex gap-2">
                                    <button class="btn btn-secondary" on:click={() => startEdit(student)}>
                                        <i class="fas fa-edit"></i>
                                        Edit
                                    </button>
                                    <button class="btn btn-danger" on:click={() => deleteStudent(student.id)}>
                                        <i class="fas fa-trash-alt"></i>
                                        Delete
                                    </button>
                                </div>
                            </td>
                        </tr>
                    {/each}
                    {#if students.length === 0}
                        <tr>
                            <td colspan="7" class="text-center text-gray-500">
                                <div class="flex flex-col items-center mb-4">
                                    <i class="fas fa-users text-3xl mb-2"></i>
                                    <p>No students found</p>
                                </div>
                            </td>
                        </tr>
                    {/if}
                </tbody>
            </table>
        </div>
    </div>
</div> 