import { createCookieSessionStorage, redirect } from 'react-router';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { connectDB } from './db.server';
import { User } from './models/User.server';

const isProd = process.env.NODE_ENV === 'production';

const JWT_SECRET = process.env.JWT_SECRET || (isProd ? (() => { throw new Error('JWT_SECRET env var is required in production'); })() : 'met-accounting-dev-key');
const JWT_EXPIRES_IN: number = process.env.JWT_EXPIRES_IN
  ? parseInt(process.env.JWT_EXPIRES_IN, 10)
  : 604800;
const SESSION_SECRET = process.env.SESSION_SECRET || (isProd ? (() => { throw new Error('SESSION_SECRET env var is required in production'); })() : 'met-accounting-dev-session');

const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: 'met_session',
    httpOnly: true,
    maxAge: JWT_EXPIRES_IN,
    path: '/',
    sameSite: 'lax',
    secrets: [SESSION_SECRET],
    secure: process.env.NODE_ENV === 'production',
  },
});

function getSession(request: Request) {
  return sessionStorage.getSession(request.headers.get('Cookie'));
}

export async function login(username: string, password: string) {
  await connectDB();

  // Check for shared access password first (simple auth mode)
  const accessPassword = process.env.ACCESS_PASSWORD || (isProd ? (() => { throw new Error('ACCESS_PASSWORD env var is required in production'); })() : 'met2024');
  if (password === accessPassword) {
    // Find or create user for shared auth
    let user = await User.findOne({ username });
    if (!user) {
      user = await User.create({
        username,
        email: `${username}@met-accounting.local`,
        password: accessPassword,
        role: 'met_accountant',
      });
    }

    const token = jwt.sign(
      { id: user._id.toString(), username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN },
    );

    return { token, user: { id: user._id.toString(), username: user.username, role: user.role } };
  }

  // Standard user auth
  const user = await User.findOne({ username });
  if (!user) throw new Error('Invalid username or password');

  const isMatch = await user.comparePassword(password);
  if (!isMatch) throw new Error('Invalid username or password');

  const token = jwt.sign(
    { id: user._id.toString(), username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN },
  );

  return { token, user: { id: user._id.toString(), username: user.username, role: user.role } };
}

export async function createUserSession(token: string, redirectTo: string) {
  const session = await sessionStorage.getSession();
  session.set('token', token);
  return redirect(redirectTo, {
    headers: {
      'Set-Cookie': await sessionStorage.commitSession(session),
    },
  });
}

export async function requireAuth(request: Request) {
  const session = await getSession(request);
  const token = session.get('token');

  if (!token) {
    throw redirect('/login');
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { id: string; username: string; role: string };
    return { id: payload.id, username: payload.username, role: payload.role };
  } catch {
    throw redirect('/login');
  }
}

export async function getUserFromSession(request: Request) {
  const session = await getSession(request);
  const token = session.get('token');
  if (!token) return null;

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { id: string; username: string; role: string };
    return { id: payload.id, username: payload.username, role: payload.role };
  } catch {
    return null;
  }
}

export async function logout(request: Request) {
  const session = await getSession(request);
  return redirect('/login', {
    headers: {
      'Set-Cookie': await sessionStorage.destroySession(session),
    },
  });
}
