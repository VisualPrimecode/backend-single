// src/swagger.ts
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Nuvro Ai SaaS API Documentation',
      version: '1.0.0',
      description: 'Documentation for our Nuvro SaaS product API',
    },
    servers: [
      {
        url: 'https://nuvro-saas.onrender.com/api/v1', // Adjust based on your environment
      },
    ],
  },
  // Paths to files containing your API documentation (annotations)
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
};

const swaggerSpec = swaggerJSDoc(options);

export { swaggerUi, swaggerSpec };
