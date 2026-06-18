import express from 'express';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';

const router = express.Router();

// Load OpenAPI specification
const swaggerDocument = YAML.load(path.join(__dirname, '../docs/openapi.yaml'));

export function buildSwaggerUiOptions(nodeEnv: string = process.env.NODE_ENV ?? 'production') {
  const allowTryItOut = nodeEnv !== 'production';
  const requestInterceptor = allowTryItOut
    ? (req: { headers: Record<string, string> }) => {
        // Add authorization header if token is available in browser context.
        const token = localStorage.getItem('auth_token');
        if (token) {
          req.headers.Authorization = `Bearer ${token}`;
        }
        return req;
      }
    : undefined;

  return {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'MuseBar API Documentation',
    customfavIcon: '/favicon.ico',
    swaggerOptions: {
      docExpansion: 'list' as const,
      filter: true,
      showRequestHeaders: true,
      showCommonExtensions: true,
      tryItOutEnabled: allowTryItOut,
      ...(requestInterceptor ? { requestInterceptor } : {}),
    },
  };
}

// Serve Swagger UI
router.use('/', swaggerUi.serve);
router.get('/', swaggerUi.setup(swaggerDocument, buildSwaggerUiOptions()));

// Serve OpenAPI specification as JSON
router.get('/openapi.json', (req, res) => {
  res.json(swaggerDocument);
});

// Serve OpenAPI specification as YAML
router.get('/openapi.yaml', (req, res) => {
  res.setHeader('Content-Type', 'text/yaml');
  res.send(YAML.stringify(swaggerDocument, 10));
});

export default router; 