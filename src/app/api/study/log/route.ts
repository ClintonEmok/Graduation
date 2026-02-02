import { NextRequest, NextResponse } from 'next/server';
import { appendFile } from 'fs/promises';
import { join } from 'path';

const LOG_FILE = join(process.cwd(), 'logs', 'study-sessions.jsonl');

export async function POST(req: NextRequest) {
  try {
    const logs = await req.json();
    
    if (!Array.isArray(logs)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Convert logs to NDJSON lines
    const lines = logs.map(log => JSON.stringify(log) + '\n').join('');
    
    await appendFile(LOG_FILE, lines);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error writing logs:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
