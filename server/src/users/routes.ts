import { Router } from 'express';
import { HttpError } from '../http-error.js';
import type { UsersRepository } from './repository.js';
import { parseId, userInputSchema } from './validation.js';

export function createUsersRouter(users: UsersRepository): Router {
  const router = Router();

  router.get('/', async (_req, res) => {
    res.json(await users.list());
  });

  // Any `id` in the body is ignored; the database assigns it
  router.post('/', async (req, res) => {
    const input = userInputSchema.parse(req.body);
    res.status(201).json(await users.create(input));
  });

  // The path id wins over any id in the body
  router.put('/:id', async (req, res) => {
    const id = parseId(req.params['id']);
    const input = userInputSchema.parse(req.body);
    const updated = await users.update(id, input);
    if (!updated) {
      throw new HttpError(404, 'not_found', 'User not found');
    }
    res.json(updated);
  });

  router.delete('/:id', async (req, res) => {
    const id = parseId(req.params['id']);
    if (!(await users.remove(id))) {
      throw new HttpError(404, 'not_found', 'User not found');
    }
    res.json({});
  });

  return router;
}
