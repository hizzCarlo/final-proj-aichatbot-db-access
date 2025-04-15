CREATE TABLE `student` (
	`id` integer PRIMARY KEY NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`email` text NOT NULL,
	`major` text NOT NULL,
	`enrollment_date` text NOT NULL,
	`gender` text NOT NULL,
	`age` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `student_grade` (
	`id` integer PRIMARY KEY NOT NULL,
	`student_id` integer NOT NULL,
	`subject_id` integer NOT NULL,
	`grade` real NOT NULL,
	`semester` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `student`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`subject_id`) REFERENCES `subject`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `subject` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`code` text NOT NULL,
	`description` text
);
--> statement-breakpoint
DROP TABLE `users`;