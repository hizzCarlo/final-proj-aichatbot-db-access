import {db} from "$lib/server/db";
import {user} from "$lib/server/db/schema";
import { json } from "@sveltejs/kit";

import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
    const data = await db.select().from(user);

// iplement ollama here

    return json({response: ' the summary is ...'});
};

