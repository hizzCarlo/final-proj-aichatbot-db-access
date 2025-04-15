import { db } from "$lib/server/db";
import { subject } from "$lib/server/db/schema";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from './$types';
import { eq } from 'drizzle-orm';

export const GET: RequestHandler = async () => {
    const data = await db.select().from(subject);
    return json({ data });
};

export const POST: RequestHandler = async ({ request }) => {
    const body = await request.json();
    await db.insert(subject).values(body);
    return json({ success: true });
};

export const PUT: RequestHandler = async ({ request }) => {
    const { id, ...updateData } = await request.json();
    await db.update(subject)
        .set(updateData)
        .where(eq(subject.id, id));
    return json({ success: true });
};

export const DELETE: RequestHandler = async ({ request }) => {
    const { id } = await request.json();
    await db.delete(subject)
        .where(eq(subject.id, id));
    return json({ success: true });
}; 