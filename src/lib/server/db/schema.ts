import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const student = sqliteTable('student', {
	id: integer('id').primaryKey(),
	firstName: text('first_name').notNull(),
	lastName: text('last_name').notNull(),
	email: text('email').notNull(),
	grade: integer('grade').notNull(),
	major: text('major').notNull(),
	enrollmentDate: text('enrollment_date').notNull(),
	gender: text('gender').notNull(),
	age: integer('age').notNull()
});
