import { NextResponse } from 'next/server';
import { db } from '@/db';
import { resources } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    const id = parseInt(params.id);
    const body = await request.json();
    
    if(!body.name || !body.categoryId) return NextResponse.json({ error: 'missing_fields' }, { status: 400 });

    const { DictionaryService } = await import('@/services/DictionaryService');
    await DictionaryService.updateResource(id, { 
       name: body.name, 
       categoryId: parseInt(body.categoryId) 
    });
    
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: 'save_error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    const id = parseInt(params.id);
    if (!id) return NextResponse.json({ error: 'fetch_error' }, { status: 400 });

    const { DictionaryService } = await import('@/services/DictionaryService');
    await DictionaryService.deleteResource(id);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("Delete machine error", err);
    return NextResponse.json({ error: 'machine_in_use' }, { status: 500 });
  }
}
