export interface Student {
    id: number;
    name: string;
    email: string;
    created_at: string;
}

export interface Grade {
    id: number;
    student_id: number;
    subject_id: number;
    grade: string;
    created_at: string;
}

export interface Subject {
    id: number;
    name: string;
    created_at: string;
}

export const GPA_SCALE = [
    { grade: 'A+', gpa: 4.0 },
    { grade: 'A', gpa: 4.0 },
    { grade: 'A-', gpa: 3.7 },
    { grade: 'B+', gpa: 3.3 },
    { grade: 'B', gpa: 3.0 },
    { grade: 'B-', gpa: 2.7 },
    { grade: 'C+', gpa: 2.3 },
    { grade: 'C', gpa: 2.0 },
    { grade: 'C-', gpa: 1.7 },
    { grade: 'D+', gpa: 1.3 },
    { grade: 'D', gpa: 1.0 },
    { grade: 'F', gpa: 0.0 }
]; 