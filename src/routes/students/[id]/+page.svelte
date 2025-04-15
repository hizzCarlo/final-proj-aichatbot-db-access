<script lang="ts">
    import { onMount } from 'svelte';

    let grade = 0;
    let gradeError = '';
    export let data;

    async function loadGrades() {
        const response = await fetch(`/api/grades?studentId=${data.id}`);
        const gradesData = await response.json();
        return gradesData.data;
    }

    async function handleSubmit() {
        try {
            if (grade > 100) {
                gradeError = 'Grade cannot be higher than 100';
                return;
            }
            if (grade < 0) {
                gradeError = 'Grade cannot be negative';
                return;
            }

            const gradeResponse = await fetch('/api/grades', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    studentId: data.id,
                    grade: grade
                })
            });

            if (!gradeResponse.ok) {
                throw new Error('Failed to save grade');
            }

            grade = 0;
            gradeError = '';
            await loadGrades();
        } catch (error) {
            console.error('Error saving grade:', error);
            gradeError = 'Failed to save grade. Please try again.';
        }
    }
</script>

<div class="form-group">
    <label for="grade">Grade</label>
    <input
        type="number"
        id="grade"
        bind:value={grade}
        min="0"
        max="100"
        class:error={gradeError}
    />
    {#if gradeError}
        <span class="error-message">{gradeError}</span>
    {/if}
    <button 
        class="btn btn-primary mt-4" 
        on:click={handleSubmit}
        disabled={grade > 100 || grade < 0}
    >
        Save Grade
    </button>
</div>

<style>
.error {
    border-color: red;
}
.error-message {
    color: red;
    font-size: 0.875rem;
    margin-top: 0.25rem;
}
.mt-4 {
    margin-top: 1rem;
}
</style> 