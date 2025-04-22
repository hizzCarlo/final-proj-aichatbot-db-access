<script lang="ts">
    import { onMount } from 'svelte';
    import { fade, slide } from 'svelte/transition';
    import { Chart } from 'chart.js/auto';
    
    import SummaryModal from '$lib/components/SummaryModal.svelte';
    import StudentSubjectsGrades from '../../components/StudentSubjectsGrades.svelte';

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
    let filteredStudents: Student[] = [];
    let majorFilter = '';
    let yearFilter = '';
    let uniqueMajors: string[] = [];
    let uniqueYears: string[] = [];
    let showChatbot = false;
    let summary = '';
    let editingStudent: Student | null = null;
    let showSummaryModal = false;
    let isSummarizing = false;
    let summaryData: any = null;
    let enrollmentPredictionChart: Chart | null = null;
    let performancePredictionChart: Chart | null = null;
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

    // Filter functions
    function updateFilters() {
        filteredStudents = students.filter(student => {
            const matchesMajor = !majorFilter || student.major === majorFilter;
            const enrollmentYear = student.enrollmentDate.split(' ')[0];
            const matchesYear = !yearFilter || enrollmentYear === yearFilter;
            return matchesMajor && matchesYear;
        });
    }

    function extractUniqueValues() {
        uniqueMajors = [...new Set(students.map(s => s.major))].sort();
        uniqueYears = [...new Set(students.map(s => s.enrollmentDate.split(' ')[0]))].sort();
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
            
            extractUniqueValues();
            filteredStudents = students; // Initialize with all students
        } catch (error) {
            console.error('Error loading data:', error);
            students = [];
            grades = [];
            filteredStudents = [];
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

    function calculatePredictions(data: any[]) {
        // Group students by year
        const enrollmentsByYear = data.reduce((acc: Record<string, number>, student: any) => {
            const year = student.enrollmentDate.split(' ')[0];
            acc[year] = (acc[year] || 0) + 1;
            return acc;
        }, {});

        // Convert to arrays for regression
        const years = Object.keys(enrollmentsByYear).sort();
        const counts = years.map(year => enrollmentsByYear[year]);

        // Simple linear regression for enrollment prediction
        const n = years.length;
        const xVals = years.map((_, i) => i);
        const yVals = counts;
        
        const xMean = xVals.reduce((a, b) => a + b, 0) / n;
        const yMean = yVals.reduce((a, b) => a + b, 0) / n;
        
        const slope = xVals.reduce((acc, x, i) => 
            acc + (x - xMean) * (yVals[i] - yMean), 0
        ) / xVals.reduce((acc, x) => acc + Math.pow(x - xMean, 2), 0);
        
        const intercept = yMean - slope * xMean;

        // Generate predictions for next 2 years
        const lastYear = parseInt(years[years.length - 1]);
        const futureYears = [1, 2].map(i => (lastYear + i).toString());
        const predictions = futureYears.map((_, i) => {
            const x = xVals.length + i;
            return Math.round(slope * x + intercept);
        });

        return {
            enrollment: {
                labels: [...years, ...futureYears],
                datasets: [{
                    label: 'Historical Enrollment',
                    data: counts,
                    borderColor: 'rgb(99, 102, 241)',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    tension: 0.4
                }, {
                    label: 'Predicted Enrollment',
                    data: [...Array(counts.length).fill(null), ...predictions],
                    borderColor: 'rgb(244, 63, 94)',
                    backgroundColor: 'rgba(244, 63, 94, 0.1)',
                    borderDash: [5, 5],
                    tension: 0.4
                }]
            },
            performance: {
                labels: years,
                datasets: [{
                    label: 'Average GPA',
                    data: years.map(year => {
                        const studentsInYear = data.filter((s: any) => s.enrollmentDate.startsWith(year));
                        const gpas = studentsInYear.map((s: any) => calculateStudentGPA(s.id).gpa);
                        return gpas.length ? 
                            Number((gpas.reduce((a: number, b: number) => a + b, 0) / gpas.length).toFixed(2)) : 
                            null;
                    }),
                    borderColor: 'rgb(99, 102, 241)',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    tension: 0.4
                }]
            }
        };
    }

    async function generateSummary() {
        if (isSummarizing) return;
        
        showSummaryModal = true;
        if (summaryData && !isSummarizing) return;
        
        isSummarizing = true;

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

            // Format the responses
            const formattedSummary = summaryResult.response
                .replace(/\n\n/g, '\n')
                .replace(/^#+\s*/gm, '###')
                .replace(/\*\*/g, '')
                .trim();

            const formattedInsights = insightResult.response
                .replace(/\n\n/g, '\n')
                .replace(/^#+\s*/gm, '###')
                .replace(/\*\*/g, '')
                .trim();

            // Calculate predictions based on actual data
            const charts = calculatePredictions(students);

            summaryData = {
                summary: formattedSummary,
                insights: formattedInsights,
                charts
            };
        } catch (error) {
            console.error('Error generating summary:', error);
            summaryData = null;
        } finally {
            isSummarizing = false;
        }
    }

    function handleClearSummary() {
        summaryData = null;
        generateSummary();
    }

    // Watch for filter changes
    $: {
        if (students.length > 0) {
            updateFilters();
        }
    }

    // Watch for filter value changes
    $: if (majorFilter !== undefined || yearFilter !== undefined) {
        updateFilters();
    }

    onMount(async () => {
        await loadData();
        updateFilters();
    });
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
    .page-header {
        margin-bottom: 2rem;
    }

    .page-header h1 {
        font-size: 2rem;
        font-weight: 600;
        color: var(--primary-color);
        margin-bottom: 0.5rem;
    }

    .page-header p {
        color: var(--text-secondary);
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

    .filters-container {
        margin-bottom: 1.5rem;
    }

    .flex {
        display: flex;
    }

    .flex-1 {
        flex: 1;
    }

    .gap-4 {
        gap: 1rem;
    }

    .mb-6 {
        margin-bottom: 1.5rem;
    }

    .modal-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    }

    .modal {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 90%;
        max-width: 1200px;
        max-height: 90vh;
        background: var(--card-background);
        border-radius: 0.5rem;
        z-index: 50;
        overflow: hidden;
    }

    .modal-content {
        display: flex;
        flex-direction: column;
        height: 100%;
    }

    .modal-header {
        padding: 1.5rem;
        border-bottom: 1px solid var(--border-color);
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .modal-body {
        padding: 1.5rem;
        overflow-y: auto;
    }

    .chart-section {
        background: var(--background-color);
        padding: 1.5rem;
        border-radius: 0.5rem;
    }

    .loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1rem;
        padding: 2rem;
    }

    .loading i {
        font-size: 2rem;
        color: var(--primary-color);
    }

    .markdown-content {
        line-height: 1.6;
    }

    .markdown-content :global(h3) {
        font-size: 1.25rem;
        font-weight: 600;
        margin: 1.5rem 0 1rem;
    }

    .markdown-content :global(ul) {
        list-style-type: disc;
        padding-left: 1.5rem;
        margin: 1rem 0;
    }

    .markdown-content :global(p) {
        margin: 1rem 0;
    }

    .modal-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    }

    .modal-container {
        background-color: var(--card-background);
        border-radius: 1rem;
        width: 90%;
        max-width: 1200px;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }

    .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1.5rem;
        border-bottom: 1px solid var(--border-color);
    }

    .modal-header h2 {
        font-size: 1.5rem;
        font-weight: 600;
        color: var(--text-primary);
        margin: 0;
    }

    .close-button {
        background: none;
        border: none;
        color: var(--text-secondary);
        cursor: pointer;
        padding: 0.5rem;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 0.5rem;
        transition: background-color 0.2s;
    }

    .close-button:hover {
        background-color: var(--hover-color);
    }

    .modal-content {
        padding: 1.5rem;
        overflow-y: auto;
        max-height: calc(90vh - 4rem);
    }

    .summary-sections {
        display: flex;
        flex-direction: column;
        gap: 2rem;
    }

    .section {
        background-color: var(--background-color);
        border-radius: 0.5rem;
        padding: 1.5rem;
    }

    .section h3 {
        font-size: 1.25rem;
        font-weight: 600;
        color: var(--primary-color);
        margin-bottom: 1rem;
    }

    .overview-content {
        line-height: 1.6;
    }

    .section-content {
        margin-bottom: 1rem;
    }

    .section-content:last-child {
        margin-bottom: 0;
    }

    ul {
        list-style-type: none;
        padding-left: 0;
    }

    li {
        position: relative;
        padding-left: 1.5rem;
        margin-bottom: 0.75rem;
    }

    li::before {
        content: "•";
        position: absolute;
        left: 0;
        color: var(--primary-color);
    }

    .chart-container {
        width: 100%;
        height: 300px;
        margin-top: 1rem;
        background-color: white;
        padding: 1rem;
        border-radius: 0.5rem;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .loading-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1rem;
        padding: 2rem;
        color: var(--text-secondary);
    }

    .loading-state i {
        font-size: 2rem;
    }

    .no-data {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1rem;
        padding: 2rem;
        color: var(--text-secondary);
    }

    .no-data i {
        font-size: 2rem;
    }

    .insights-content {
        line-height: 1.6;
        color: var(--text-primary);
    }

    :global(.dark) .section {
        background-color: var(--card-background);
    }

    :global(.dark) .chart-container {
        background-color: var(--card-background);
    }
</style>

<div class="container">
    <header class="page-header">
        <h1>Student Management</h1>
        <p>Add and manage students</p>
    </header>
   

    <!-- Add/Edit Student Form -->
    <div class="card mb-6">
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

    {#if editingStudent}
        <div class="card mb-6">
            <div class="card-header">
                <h2 class="text-xl font-bold">Subjects & Grades</h2>
            </div>
            <div class="card-body">
                <StudentSubjectsGrades 
                    studentId={editingStudent.id} 
                    isEditing={true}
                />
            </div>
        </div>
    {/if}

    <!-- Filters -->
    <div class="filters-container card mb-6">
        <div class="card-header">
            <h2 class="text-xl font-bold">Filters</h2>
        </div>
        <div class="card-body">
            <div class="flex gap-4">
                <div class="form-group flex-1">
                    <label for="majorFilter" class="form-label">Major</label>
                    <select
                        id="majorFilter"
                        bind:value={majorFilter}
                        class="form-input"
                    >
                        <option value="">All Majors</option>
                        {#each uniqueMajors as major}
                            <option value={major}>{major}</option>
                        {/each}
                    </select>
                </div>
                <div class="form-group flex-1">
                    <label for="yearFilter" class="form-label">Enrollment Year</label>
                    <select
                        id="yearFilter"
                        bind:value={yearFilter}
                        class="form-input"
                    >
                        <option value="">All Years</option>
                        {#each uniqueYears as year}
                            <option value={year}>{year}</option>
                        {/each}
                    </select>
                </div>
            </div>
        </div>
    </div>

    <!-- Student List -->
    <div class="card">
        <div class="card-header">
            <div class="flex justify-between items-center">
                <h2 class="text-xl font-bold">Student List</h2>
                <div class="flex gap-4 items-center">
                    <p class="text-sm text-gray-500">Showing {filteredStudents.length} students</p>
                    <button class="btn btn-primary" on:click={generateSummary}>
                        <i class="fas fa-chart-line mr-2"></i>
                        View Summary
                    </button>
                </div>
            </div>
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
                    {#each filteredStudents as student}
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
                    {#if filteredStudents.length === 0}
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

<SummaryModal 
    show={showSummaryModal}
    summaryData={summaryData}
    isLoading={isSummarizing}
    on:close={() => showSummaryModal = false}
    on:clear={handleClearSummary}
/> 