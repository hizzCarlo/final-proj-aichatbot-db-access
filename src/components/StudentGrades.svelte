<!-- StudentGrades.svelte -->
<script lang="ts">
    import { onMount } from 'svelte';

    export let studentId: number;
    
    interface Subject {
        id: number;
        name: string;
        code: string;
        description: string | null;
    }

    interface Grade {
        id: number;
        grade: number;
        semester: string;
        subjectId: number;
        subjectName: string;
        subjectCode: string;
        createdAt: string;
    }

    let subjects: Subject[] = [];
    let grades: Grade[] = [];
    let selectedSubjects: number[] = [];
    let gradeInputs: { [key: number]: number } = {};
    let gradeErrors: { [key: number]: string } = {};
    let currentSemester = new Date().getFullYear() + ' ' + (new Date().getMonth() < 6 ? 'Spring' : 'Fall');

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

    onMount(async () => {
        await loadSubjects();
        await loadGrades();
    });

    async function loadSubjects() {
        const response = await fetch('/api/subjects');
        const data = await response.json();
        subjects = data.data;
    }

    async function loadGrades() {
        const response = await fetch(`/api/grades?studentId=${studentId}`);
        const data = await response.json();
        grades = data.data;
        
        // Initialize selected subjects and grade inputs from existing grades
        selectedSubjects = grades.map(g => g.subjectId);
        gradeInputs = Object.fromEntries(
            grades.map(g => [g.subjectId, g.grade])
        );
    }

    function validateGrade(grade: number, subjectId: number): boolean {
        if (isNaN(grade) || grade < 0 || grade > 100) {
            gradeErrors[subjectId] = 'Grade must be between 0 and 100';
            return false;
        }
        delete gradeErrors[subjectId];
        return true;
    }

    function getGPAInfo(grade: number) {
        const gpaInfo = GPA_SCALE.find(scale => grade >= scale.min && grade <= scale.max);
        return gpaInfo || { gpa: 0, letter: 'F' };
    }

    function calculateGPA(grades: number[]): { gpa: number, letter: string } {
        if (grades.length === 0) return { gpa: 0, letter: 'N/A' };
        
        const totalGPA = grades.reduce((acc, grade) => {
            return acc + getGPAInfo(grade).gpa;
        }, 0);
        
        const avgGPA = Number((totalGPA / grades.length).toFixed(2));
        const letter = GPA_SCALE.find(scale => avgGPA >= scale.gpa)?.letter || 'F';
        
        return { gpa: avgGPA, letter };
    }

    function handleGradeInput(event: Event, subjectId: number) {
        const input = event.target as HTMLInputElement;
        let grade = Number(input.value);
        
        // Clamp the value between 0 and 100
        if (grade > 100) {
            grade = 100;
            input.value = '100';
        } else if (grade < 0) {
            grade = 0;
            input.value = '0';
        }
        
        if (validateGrade(grade, subjectId)) {
            gradeInputs[subjectId] = grade;
        }
    }

    function handleKeyPress(event: KeyboardEvent) {
        const charCode = event.charCode;
        if (charCode < 48 || charCode > 57) {
            event.preventDefault();
        }
    }

    async function saveGrades() {
        // Validate all grades before saving
        const isValid = Object.entries(gradeInputs).every(([subjectId, grade]) => 
            validateGrade(grade, parseInt(subjectId))
        );

        if (!isValid) {
            return;
        }

        const promises = Object.entries(gradeInputs).map(([subjectId, grade]) => {
            const existingGrade = grades.find(g => g.subjectId === parseInt(subjectId));
            
            if (existingGrade) {
                return fetch('/api/grades', {
                    method: 'PUT',
                    body: JSON.stringify({
                        id: existingGrade.id,
                        grade
                    }),
                    headers: { 'Content-Type': 'application/json' }
                });
            } else {
                return fetch('/api/grades', {
                    method: 'POST',
                    body: JSON.stringify({
                        studentId,
                        subjectId: parseInt(subjectId),
                        grade,
                        semester: currentSemester
                    }),
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        });

        await Promise.all(promises);
        await loadGrades();
    }

    $: gpaInfo = calculateGPA(Object.values(gradeInputs));
</script>

<div class="grades-panel">
    <div class="panel-header">
        <h3>Student Grades</h3>
        <div class="gpa-display">
            <span class="gpa-value">GPA: {gpaInfo.gpa}</span>
            <span class="letter-grade">{gpaInfo.letter}</span>
        </div>
    </div>

    <div class="subjects-grid">
        {#each subjects as subject (subject.id)}
            <div class="subject-card">
                <label class="subject-header">
                    <input
                        type="checkbox"
                        bind:group={selectedSubjects}
                        value={subject.id}
                    />
                    <span>{subject.name} ({subject.code})</span>
                </label>
                
                {#if selectedSubjects.includes(subject.id)}
                    <div class="grade-input">
                        <input
                            type="number"
                            min="0"
                            max="100"
                            value={gradeInputs[subject.id] || ''}
                            on:input={(e) => handleGradeInput(e, subject.id)}
                            on:keypress={handleKeyPress}
                            class:error={gradeErrors[subject.id]}
                            placeholder="Grade (0-100)"
                        />
                        {#if gradeErrors[subject.id]}
                            <div class="error-message">{gradeErrors[subject.id]}</div>
                        {/if}
                        {#if gradeInputs[subject.id]}
                            <div class="grade-info">
                                {getGPAInfo(gradeInputs[subject.id]).letter} 
                                ({getGPAInfo(gradeInputs[subject.id]).gpa} GPA)
                            </div>
                        {/if}
                    </div>
                {/if}
            </div>
        {/each}
    </div>

    <div class="panel-footer">
        <button 
            class="btn btn-primary" 
            on:click={saveGrades}
            disabled={Object.keys(gradeErrors).length > 0}
        >
            Save Grades
        </button>
    </div>
</div>

<style>
    .grades-panel {
        background: var(--card-background);
        border-radius: 0.5rem;
        padding: 1.5rem;
        margin-top: 1rem;
    }

    .panel-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
    }

    .gpa-display {
        display: flex;
        align-items: center;
        gap: 1rem;
    }

    .gpa-value {
        font-size: 1.25rem;
        font-weight: 600;
        color: var(--primary-color);
    }

    .letter-grade {
        font-size: 1.5rem;
        font-weight: bold;
        padding: 0.25rem 0.5rem;
        border-radius: 0.25rem;
        background: var(--primary-color);
        color: white;
    }

    .subjects-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
        gap: 1rem;
        margin-bottom: 1.5rem;
    }

    .subject-card {
        background: var(--background-color);
        padding: 1rem;
        border-radius: 0.375rem;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .subject-header {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-weight: 500;
    }

    .grade-input {
        margin-top: 0.5rem;
    }

    .grade-input input {
        width: 100%;
        padding: 0.5rem;
        border: 1px solid var(--border-color);
        border-radius: 0.25rem;
        background: var(--card-background);
        color: var(--text-primary);
    }

    :global(.dark) .grade-input input {
        background: var(--card-background);
        color: var(--text-primary);
        border-color: var(--border-color);
    }

    .grade-input input.error {
        border-color: #dc2626;
    }

    .error-message {
        color: #dc2626;
        font-size: 0.875rem;
        margin-top: 0.25rem;
    }

    .grade-info {
        margin-top: 0.25rem;
        font-size: 0.875rem;
        color: var(--text-secondary);
    }

    :global(.dark) .grade-info {
        color: var(--text-secondary);
    }

    .panel-footer {
        display: flex;
        justify-content: flex-end;
        margin-top: 1rem;
    }

    button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
</style> 