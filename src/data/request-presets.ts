import type { RequestCollection, RequestPreset } from '@/types/request'

export const requestCollections: RequestCollection[] = [
  {
    id: 'collection-my-project',
    name: 'My Project',
    expanded: true,
    requests: [
      {
        id: 'users-list',
        name: 'GET /users',
        description: 'Fetch a paginated list of platform users for the admin dashboard.',
        tags: ['users', 'list'],
        collectionId: 'collection-my-project',
        collectionName: 'My Project',
        method: 'GET',
        url: '{{baseUrl}}/users',
        params: [
          { key: '_page', value: '1', description: 'Page number', enabled: true },
          { key: '_limit', value: '5', description: 'Items per page', enabled: true },
        ],
        headers: [
          { key: 'Accept', value: 'application/json', description: '', enabled: true },
        ],
      },
      {
        id: 'login-post',
        name: 'POST /login',
        description: 'Exchange credentials for an authenticated session token.',
        tags: ['auth', 'session'],
        collectionId: 'collection-my-project',
        collectionName: 'My Project',
        method: 'POST',
        url: '{{baseUrl}}/posts',
        headers: [
          { key: 'Content-Type', value: 'application/json', description: '', enabled: true },
          { key: 'Accept', value: 'application/json', description: '', enabled: true },
        ],
        body: '{\n  "email": "john@example.com",\n  "password": "secret123",\n  "clientId": "{{clientId}}"\n}',
        auth: {
          type: 'bearer',
          bearerToken: '{{token}}',
        },
      },
      {
        id: 'update-user',
        name: 'PUT /users/:id',
        description: 'Update a single user profile record with the latest contact data.',
        tags: ['users', 'write'],
        collectionId: 'collection-my-project',
        collectionName: 'My Project',
        method: 'PUT',
        url: '{{baseUrl}}/users/1',
        headers: [
          { key: 'Content-Type', value: 'application/json', description: '', enabled: true },
        ],
        body: '{\n  "name": "Updated User",\n  "phone": "+86 13800000000"\n}',
      },
      {
        id: 'delete-user',
        name: 'DELETE /users/:id',
        description: 'Remove a user record from the system by its primary identifier.',
        tags: ['users', 'danger'],
        collectionId: 'collection-my-project',
        collectionName: 'My Project',
        method: 'DELETE',
        url: '{{baseUrl}}/users/1',
      },
    ],
  },
  {
    id: 'collection-ecommerce-api',
    name: 'E-commerce API',
    expanded: false,
    requests: [
      {
        id: 'products-list',
        name: 'GET /products',
        description: 'Load the storefront product catalog for merchandising previews.',
        tags: ['catalog', 'products'],
        collectionId: 'collection-ecommerce-api',
        collectionName: 'E-commerce API',
        method: 'GET',
        url: 'https://fakestoreapi.com/products',
        params: [
          { key: 'limit', value: '5', description: 'Limit rows', enabled: true },
        ],
      },
      {
        id: 'create-order',
        name: 'POST /orders',
        description: 'Create a new cart or order payload for checkout flow testing.',
        tags: ['checkout', 'orders'],
        collectionId: 'collection-ecommerce-api',
        collectionName: 'E-commerce API',
        method: 'POST',
        url: 'https://fakestoreapi.com/carts',
        headers: [
          { key: 'Content-Type', value: 'application/json', description: '', enabled: true },
        ],
        body: '{\n  "userId": 1,\n  "date": "2026-03-25",\n  "products": [{ "productId": 1, "quantity": 2 }]\n}',
      },
    ],
  },
  {
    id: 'collection-auth-service',
    name: 'Auth Service',
    expanded: false,
    requests: [
      {
        id: 'token-post',
        name: 'POST /token',
        description: 'Request a machine-to-machine access token from the auth gateway.',
        tags: ['auth', 'token'],
        collectionId: 'collection-auth-service',
        collectionName: 'Auth Service',
        method: 'POST',
        url: '{{baseUrl}}/posts',
        headers: [
          { key: 'Content-Type', value: 'application/json', description: '', enabled: true },
        ],
        body: '{\n  "grant_type": "client_credentials",\n  "client_id": "demo-client",\n  "client_secret": "demo-secret"\n}',
        auth: {
          type: 'basic',
          username: '{{clientId}}',
          password: 'demo-secret',
        },
      },
      {
        id: 'refresh-post',
        name: 'POST /refresh',
        description: 'Refresh an expiring access token using a stored refresh token.',
        tags: ['auth', 'refresh'],
        collectionId: 'collection-auth-service',
        collectionName: 'Auth Service',
        method: 'POST',
        url: '{{baseUrl}}/posts',
        headers: [
          { key: 'Content-Type', value: 'application/json', description: '', enabled: true },
        ],
        body: '{\n  "refresh_token": "demo-refresh-token"\n}',
      },
    ],
  },
]

export const defaultRequestPreset: RequestPreset = requestCollections[0].requests[0]
