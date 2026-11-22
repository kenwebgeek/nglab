import { Router } from 'express';
import { HttpError } from '../http-error.js';
import { clearSessionCookie } from '../auth/session-cookie.js';
import { hashPassword } from '../accounts/password.js';
import type { UsersRepository } from './repository.js';
import { managedUserInputSchema, managedUserUpdateSchema, parseId } from './validation.js';

export function createUsersRouter(users: UsersRepository, secureCookies: boolean): Router {
  const router = Router();

  router.get('/', async (_req, res) => {
    res.json(await users.list());
  });

  // Any `id` in the body is ignored; the database assigns it
  router.post('/', async (req, res) => {
    if (!req.auth!.user.admin) {
      throw new HttpError(403, 'forbidden', 'Only admins can add users');
    }
    const input = managedUserInputSchema.parse(req.body);
    res.status(201).json(await users.create(input));
  });

  // The path id wins over any id in the body
  router.put('/:id', async (req, res) => {
    const id = parseId(req.params['id']);
    if (!req.auth!.user.admin && req.auth!.user.id !== id) {
      throw new HttpError(403, 'forbidden', 'You can only update your own profile');
    }
    const { newPassword, ...input } = managedUserUpdateSchema.parse(req.body);
    if (!req.auth!.user.admin && newPassword !== undefined) {
      throw new HttpError(403, 'forbidden', 'Only admins can set passwords for other users');
    }
    if (!req.auth!.user.admin && input.admin !== undefined) {
      throw new HttpError(403, 'forbidden', 'Only admins can change roles');
    }
    if (newPassword !== undefined && req.auth!.user.id === id) {
      throw new HttpError(403, 'forbidden', 'Use your account page to change your password');
    }
    const updated = newPassword === undefined
      ? await users.update(id, input)
      : await users.updateWithPassword(id, input, await hashPassword(newPassword));
    if (!updated) {
      throw new HttpError(404, 'not_found', 'User not found');
    }
    res.json(updated);
  });

  router.delete('/:id', async (req, res) => {
    const id = parseId(req.params['id']);
    if (!req.auth!.user.admin && req.auth!.user.id !== id) {
      throw new HttpError(403, 'forbidden', 'You can only delete your own account');
    }
    if (!(await users.remove(id))) {
      throw new HttpError(404, 'not_found', 'User not found');
    }
    if (req.auth!.user.id === id) {
      clearSessionCookie(res, secureCookies);
    }
    res.json({});
  });

  return router;
}
