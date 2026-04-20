import { NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { SignJWT } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'super-secret-fallback');

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { usernameEmail, password } = body;

    // Podstawowa walidacja wejścia
    if (!usernameEmail || !password) {
      return NextResponse.json(
        { error: 'Brak loginu lub hasła' }, 
        { status: 400 }
      );
    }

    // Znalezienie użytkownika
    const existingUsers = await db
      .select()
      .from(users)
      .where(eq(users.usernameEmail, usernameEmail))
      .limit(1);
    
    if (existingUsers.length === 0) {
      return NextResponse.json({ error: 'Nieprawidłowe dane logowania' }, { status: 401 });
    }

    const user = existingUsers[0];

    // Sprawdzenie, czy konto aktywne
    if (!user.isActive) {
      return NextResponse.json({ error: 'Konto zostało zablokowane' }, { status: 403 });
    }

    // Weryfikacja hasła za pomocą bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    
    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Nieprawidłowe dane logowania' }, { status: 401 });
    }

    // Generowanie zabezpieczonego JWT przy użyciu jose (Edge Compatible)
    const jwt = await new SignJWT({
      userId: user.id,
      role: user.role,
      username: user.usernameEmail,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d') // Token ważny 7 dni
      .sign(JWT_SECRET);

    // Sukces autoryzacji
    return NextResponse.json({
      token: jwt,
      user: {
        id: user.id,
        fullName: user.fullName,
        role: user.role,
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Wewnętrzny Błąd Serwera' }, { status: 500 });
  }
}
