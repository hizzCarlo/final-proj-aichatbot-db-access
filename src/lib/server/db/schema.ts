import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const student = sqliteTable('student', {
	id: integer('id').primaryKey(),
	firstName: text('first_name').notNull(),
	lastName: text('last_name').notNull(),
	email: text('email').notNull(),
	major: text('major').notNull(),
	enrollmentDate: text('enrollment_date').notNull(),
	gender: text('gender').notNull(),
	age: integer('age').notNull()
});

export const subject = sqliteTable('subject', {
	id: integer('id').primaryKey(),
	name: text('name').notNull(),
	code: text('code').notNull(),
	description: text('description')
});

export const studentGrade = sqliteTable('student_grade', {
	id: integer('id').primaryKey(),
	studentId: integer('student_id').notNull().references(() => student.id),
	subjectId: integer('subject_id').notNull().references(() => subject.id),
	grade: real('grade').notNull(), // Using real for decimal grades
	semester: text('semester').notNull(), // e.g., "Fall 2023"
	createdAt: text('created_at').notNull()
});
