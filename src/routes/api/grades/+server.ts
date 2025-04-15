import { db } from "$lib/server/db";
import { studentGrade, subject } from "$lib/server/db/schema";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from './$types';
import { eq, and } from 'drizzle-orm';

export const GET: RequestHandler = async ({ url }) => {
    const studentId = url.searchParams.get('studentId');
    
    const query = db
        .select({
            id: studentGrade.id,
            studentId: studentGrade.studentId,
            grade: studentGrade.grade,
            semester: studentGrade.semester,
            subjectId: studentGrade.subjectId,
            subjectName: subject.name,
            subjectCode: subject.code,
            createdAt: studentGrade.createdAt
        })
        .from(studentGrade)
        .leftJoin(subject, eq(studentGrade.subjectId, subject.id));

    if (studentId) {
        const data = await query.where(eq(studentGrade.studentId, parseInt(studentId)));
        return json({ data });
    }

    const data = await query;
    return json({ data });
};

export const POST: RequestHandler = async ({ request }) => {
    const body = await request.json();
    
    // Add creation timestamp
    const gradeData = {
        ...body,
        createdAt: new Date().toISOString()
    };

    await db.insert(studentGrade).values(gradeData);
    return json({ success: true });
};

export const PUT: RequestHandler = async ({ request }) => {
    const { id, ...updateData } = await request.json();
    await db.update(studentGrade)
        .set(updateData)
        .where(eq(studentGrade.id, id));
    return json({ success: true });
};

export const DELETE: RequestHandler = async ({ request }) => {
    const { studentId, subjectId } = await request.json();
    await db.delete(studentGrade)
        .where(
            and(
                eq(studentGrade.studentId, studentId),
                eq(studentGrade.subjectId, subjectId)
            )
        );
    return json({ success: true });
}; 