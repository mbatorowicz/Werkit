import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import type { UserUpdatePayload } from '@/services/AdminUserService';
import { guardAdminMutation } from '@/lib/requireAdminMutation';

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = await guardAdminMutation();
  if (denied) return denied;

  try {
    const params = await context.params;
    const id = parseInt(params.id);
    if (!id) return NextResponse.json({ error: 'fetch_error' }, { status: 400 });

    const body = await request.json();
    
    const normalizedRole =
      body.role === 'admin' ? 'admin' : body.role === 'viewer' ? 'viewer' : 'worker';

    const updateData: UserUpdatePayload = {
      fullName: body.fullName,
      usernameEmail: body.usernameEmail,
      role: normalizedRole,
    };

    if (normalizedRole === 'worker' && body.canCreateOwnOrders !== undefined) {
      updateData.canCreateOwnOrders = !!body.canCreateOwnOrders;
    } else {
      updateData.canCreateOwnOrders = false;
    }

    if (body.password && body.password.trim() !== '') {
       updateData.passwordHash = await bcrypt.hash(body.password, 10);
    }

    const { AdminUserService } = await import('@/services/AdminUserService');
    await AdminUserService.updateUser(id, updateData);
    
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("Update user error", err);
    return NextResponse.json({ error: 'save_error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = await guardAdminMutation();
  if (denied) return denied;

  try {
    const params = await context.params;
    const id = parseInt(params.id);
    if (!id) return NextResponse.json({ error: 'fetch_error' }, { status: 400 });

    const { AdminUserService } = await import('@/services/AdminUserService');
    await AdminUserService.deleteUser(id);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("Delete user error", err);
    return NextResponse.json({ error: 'delete_error' }, { status: 500 });
  }
}
