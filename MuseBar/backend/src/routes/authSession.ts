import express from 'express';
import loginRouter from './authLogin';
import registerRouter from './authRegister';
import passwordRouter from './authPassword';
import { getJwtJwks, getJwtSigningAlgorithm } from '../security/jwtConfig';

const router = express.Router();

router.get('/.well-known/jwks.json', (_req, res) => {
  const jwks = getJwtJwks();
  if (jwks.keys.length === 0 || getJwtSigningAlgorithm() !== 'RS256') {
    return res.status(404).json({ error: 'JWKS endpoint is not enabled' });
  }
  return res.json(jwks);
});

router.use(loginRouter);
router.use(registerRouter);
router.use(passwordRouter);

export default router;
