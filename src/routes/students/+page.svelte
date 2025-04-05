<script lang="ts">
    import { onMount } from 'svelte';
    import { fade, slide } from 'svelte/transition';

    interface Student {
        id: number;
        firstName: string;
        lastName: string;
        email: string;
        grade: number;
        major: string;
        enrollmentDate: string;
        gender: string;
        age: number;
    }

    let students: Student[] = [];
    let showChatbot = false;
    let summary = '';
    let editingStudent: Student | null = null;
    let formData = {
        firstName: '',
        lastName: '',
        email: '',
        grade: '',
        major: '',
        enrollmentDate: '',
        gender: '',
        age: ''
    };

    const genderOptions = ['Male', 'Female'];

    async function loadStudents() {
        const response = await fetch('/api/students');
        const data = await response.json();
        students = data.data;
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
            grade: student.grade.toString(),
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
            grade: '',
            major: '',
            enrollmentDate: '',
            gender: '',
            age: ''
        };
    }

    async function handleSubmit() {
        const studentData = {
            ...formData,
            grade: parseInt(formData.grade),
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
        
        await loadStudents();
        resetForm();
    }

    async function deleteStudent(id: number) {
        if (confirm('Are you sure you want to delete this student?')) {
            await fetch('/api/students', {
                method: 'DELETE',
                body: JSON.stringify({ id }),
                headers: { 'Content-Type': 'application/json' }
            });
            await loadStudents();
        }
    }

    onMount(loadStudents);
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
</style>

<div class="container">
    <div class="flex justify-between items-center mb-6">
        <header class="student-header">
            <h1>Student Management</h1>
        </header>
    </div>

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
                    <label for="grade" class="form-label">Grade</label>
                    <input
                        id="grade"
                        bind:value={formData.grade}
                        type="number"
                        min="0"
                        max="100"
                        placeholder="Enter grade"
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


    <div class="card">
        <div class="card-header">
            <h2 class="text-xl font-bold">Student List</h2>
        </div>
        <div class="table-container">
            <table class="table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Grade</th>
                        <th>Major</th>
                        <th>Gender</th>
                        <th>Age</th>
                        <th>Enrollment Date</th>
                        <th class="text-right">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {#each students as student}
                        <tr>
                            <td>
                                <div class="text-gray-900">{student.firstName} {student.lastName}</div>
                            </td>
                            <td>
                                <div class="text-gray-500">{student.email}</div>
                            </td>
                            <td>
                                <div class="text-gray-900">{student.grade}</div>
                            </td>
                            <td>
                                <div class="text-gray-900">{student.major}</div>
                            </td>
                            <td>
                                <div class="text-gray-900">{student.gender}</div>
                            </td>
                            <td>
                                <div class="text-gray-900">{student.age}</div>
                            </td>
                            <td>
                                <div class="text-gray-500">{new Date(student.enrollmentDate).toLocaleDateString()}</div>
                            </td>
                            <td class="text-right">
                                <div class="flex justify-end gap-2">
                                    <button
                                        on:click={() => startEdit(student)}
                                        class="btn btn-secondary"
                                    >
                                        <i class="fas fa-edit"></i>
                                        Edit
                                    </button>
                                    <button
                                        on:click={() => deleteStudent(student.id)}
                                        class="btn btn-danger"
                                    >
                                        <i class="fas fa-trash-alt"></i>
                                        Delete
                                    </button>
                                </div>
                            </td>
                        </tr>
                    {/each}
                    {#if students.length === 0}
                        <tr>
                            <td colspan="8" class="text-center text-gray-500">
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