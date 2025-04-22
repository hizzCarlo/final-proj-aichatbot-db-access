import { db } from "$lib/server/db";
import { student } from "$lib/server/db/schema";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from './$types';
import { eq } from 'drizzle-orm';

export const GET: RequestHandler = async () => {
    try {
        const data = await db.select().from(student);
        return json({ data });
    } catch (error) {
        console.error('Error fetching students:', error);
        return json({ error: 'Failed to fetch students' }, { status: 500 });
    }
};

export const POST: RequestHandler = async ({ request }) => {
    try {
        const body = await request.json();
        await db.insert(student).values(body);
        return json({ success: true });
    } catch (error) {
        console.error('Error creating student:', error);
        return json({ error: 'Failed to create student' }, { status: 500 });
    }
};

export const PUT: RequestHandler = async ({ request }) => {
    try {
        const { id, ...updateData } = await request.json();
        await db.update(student)
            .set(updateData)
            .where(eq(student.id, id));
        return json({ success: true });
    } catch (error) {
        console.error('Error updating student:', error);
        return json({ error: 'Failed to update student' }, { status: 500 });
    }
};

export const DELETE: RequestHandler = async ({ request }) => {
    try {
        const { id } = await request.json();
        await db.delete(student)
            .where(eq(student.id, id));
        return json({ success: true });
    } catch (error) {
        console.error('Error deleting student:', error);
        return json({ error: 'Failed to delete student' }, { status: 500 });
    }
}; 