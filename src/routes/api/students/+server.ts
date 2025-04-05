import { db } from "$lib/server/db";
import { student } from "$lib/server/db/schema";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from './$types';
import { eq } from 'drizzle-orm';

export const GET: RequestHandler = async () => {
    const data = await db.select().from(student);
    return json({ data });
};

export const POST: RequestHandler = async ({ request }) => {
    const body = await request.json();
    await db.insert(student).values(body);
    return json({ success: true });
};

export const PUT: RequestHandler = async ({ request }) => {
    const { id, ...updateData } = await request.json();
    await db.update(student)
        .set(updateData)
        .where(eq(student.id, id));
    return json({ success: true });
};

export const DELETE: RequestHandler = async ({ request }) => {
    const { id } = await request.json();
    await db.delete(student)
        .where(eq(student.id, id));
    return json({ success: true });
}; 