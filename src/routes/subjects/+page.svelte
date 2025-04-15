<script lang="ts">
    import { onMount } from 'svelte';
    import { fade } from 'svelte/transition';

    interface Subject {
        id: number;
        name: string;
        code: string;
        description: string | null;
    }

    let subjects: Subject[] = [];
    let editingSubject: Subject | null = null;
    let formData = {
        name: '',
        code: '',
        description: ''
    };

    onMount(loadSubjects);

    async function loadSubjects() {
        const response = await fetch('/api/subjects');
        const data = await response.json();
        subjects = data.data;
    }

    function startEdit(subject: Subject) {
        editingSubject = subject;
        formData = {
            name: subject.name,
            code: subject.code,
            description: subject.description || ''
        };
    }

    function cancelEdit() {
        editingSubject = null;
        resetForm();
    }

    function resetForm() {
        formData = {
            name: '',
            code: '',
            description: ''
        };
    }

    async function handleSubmit() {
        if (editingSubject) {
            await fetch('/api/subjects', {
                method: 'PUT',
                body: JSON.stringify({ id: editingSubject.id, ...formData }),
                headers: { 'Content-Type': 'application/json' }
            });
            editingSubject = null;
        } else {
            await fetch('/api/subjects', {
                method: 'POST',
                body: JSON.stringify(formData),
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        await loadSubjects();
        resetForm();
    }

    async function deleteSubject(id: number) {
        if (confirm('Are you sure you want to delete this subject?')) {
            await fetch('/api/subjects', {
                method: 'DELETE',
                body: JSON.stringify({ id }),
                headers: { 'Content-Type': 'application/json' }
            });
            await loadSubjects();
        }
    }
</script>

<div class="container">
    <header class="page-header">
        <h1>Subject Management</h1>
        <p>Add and manage subjects</p>
    </header>

    <div class="card">
        <div class="card-header">
            <h2 class="text-xl font-bold">{editingSubject ? 'Edit Subject' : 'Add New Subject'}</h2>
        </div>
        <div class="card-body">
            <form on:submit|preventDefault={handleSubmit} class="form-grid">
                <div class="form-group">
                    <label for="name" class="form-label">Subject Name</label>
                    <input
                        id="name"
                        bind:value={formData.name}
                        placeholder="Enter subject name"
                        class="form-input"
                        required
                    />
                </div>
                <div class="form-group">
                    <label for="code" class="form-label">Subject Code</label>
                    <input
                        id="code"
                        bind:value={formData.code}
                        placeholder="Enter subject code"
                        class="form-input"
                        required
                    />
                </div>
                <div class="form-group col-span-2">
                    <label for="description" class="form-label">Description</label>
                    <textarea
                        id="description"
                        bind:value={formData.description}
                        placeholder="Enter subject description"
                        class="form-input"
                        rows="3"
                    ></textarea>
                </div>
                <div class="form-group col-span-2 flex justify-between">
                    <button type="submit" class="btn btn-primary">
                        <i class="fas {editingSubject ? 'fa-save' : 'fa-plus'}"></i>
                        {editingSubject ? 'Update Subject' : 'Add Subject'}
                    </button>
                    {#if editingSubject}
                        <button type="button" class="btn btn-secondary" on:click={cancelEdit}>
                            <i class="fas fa-times"></i>
                            Cancel
                        </button>
                    {/if}
                </div>
            </form>
        </div>
    </div>

    <div class="card">
        <div class="card-header">
            <h2 class="text-xl font-bold">Subject List</h2>
        </div>
        <div class="table-container">
            <table class="table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Code</th>
                        <th>Description</th>
                        <th class="text-right">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {#each subjects as subject}
                        <tr transition:fade>
                            <td>
                                <div class="text-gray-900">{subject.name}</div>
                            </td>
                            <td>
                                <div class="text-gray-900">{subject.code}</div>
                            </td>
                            <td>
                                <div class="text-gray-500">{subject.description || '-'}</div>
                            </td>
                            <td class="text-right">
                                <div class="flex justify-end gap-2">
                                    <button
                                        on:click={() => startEdit(subject)}
                                        class="btn btn-secondary"
                                    >
                                        <i class="fas fa-edit"></i>
                                        Edit
                                    </button>
                                    <button
                                        on:click={() => deleteSubject(subject.id)}
                                        class="btn btn-danger"
                                    >
                                        <i class="fas fa-trash-alt"></i>
                                        Delete
                                    </button>
                                </div>
                            </td>
                        </tr>
                    {/each}
                    {#if subjects.length === 0}
                        <tr>
                            <td colspan="4" class="text-center text-gray-500">
                                <div class="flex flex-col items-center mb-4">
                                    <i class="fas fa-book text-3xl mb-2"></i>
                                    <p>No subjects found</p>
                                </div>
                            </td>
                        </tr>
                    {/if}
                </tbody>
            </table>
        </div>
    </div>
</div>

<style>
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

    .col-span-2 {
        grid-column: span 2;
    }

    textarea {
        resize: vertical;
        min-height: 100px;
    }

    :global(.dark) .text-gray-900 {
        color: var(--text-primary);
    }

    :global(.dark) .text-gray-500 {
        color: var(--text-secondary);
    }

    :global(.dark) .table th {
        color: var(--text-primary);
    }
</style> 