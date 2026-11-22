import { Router } from 'express';
import { HttpError } from '../http-error.js';
import { clearSessionCookie } from '../auth/session-cookie.js';
import type { UsersRepository } from './repository.js';
import { managedUserInputSchema, parseId } from './validation.js';

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
    const input = managedUserInputSchema.parse(req.body);
    if (!req.auth!.user.admin && input.admin !== undefined) {
      throw new HttpError(403, 'forbidden', 'Only admins can change roles');
    }
    const updated = await users.update(id, input);
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
