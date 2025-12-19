import 'dotenv/config';

import Fastify from 'fastify';
import websocketPlugin from '@fastify/websocket';
import corsPlugin from '@fastify/cors';
import { readFileSync } from 'fs';

import { CollaborationBuilder, LoadFn, AutoSaveFn } from '@superdoc-dev/superdoc-yjs-collaboration';
import { encodeStateAsUpdate, Doc as YDoc } from 'yjs';

import { saveDocument, loadDocument, initDatabase } from './storage.js';
import { generateUser } from './userGenerator.js';

const errorHandlers: Record<string, (error: Error, socket: any) => void> = {
  LoadError: (error: Error, socket: any) => {
    console.log('Document load failed:', error.message);
    socket.close(1011, 'Document unavailable');
  },
  SaveError: (error: Error, socket: any) => {
    console.log('Document save failed:', error.message);
    // Don't close connection for save errors, just log
  },
  default: (error: Error, socket: any) => {
    console.log('Something went wrong:', error.message);
    socket.close(1011, 'Unknown error');
  },
};

const fastify = Fastify({ logger: true });

// Configure CORS for frontend
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL,
].filter(Boolean) as string[];

fastify.register(corsPlugin, {
  origin: allowedOrigins,
  credentials: true,
});
fastify.register(websocketPlugin);

const SuperDocCollaboration = new CollaborationBuilder()
  .withName('SuperDoc Collaboration service')
  .withDebounce(2000)
  .onLoad((async (params) => {
    try {
      const state = await loadDocument(params.documentId);
      return state;
    } catch(error) {
      const err = new Error('Failed to load document: ' + error);
      err.name = 'LoadError';
      throw err;
    }
  }) as LoadFn)
  .onAutoSave((async (params) => {
    try {
      const { documentId, document } = params;
      if (!document) throw new Error('No document to save');
      
      const state = encodeStateAsUpdate(document);
      const success = await saveDocument(documentId, state);
      
      if (!success) throw new Error('Save returned false');
    } catch (error) {
      const err = new Error('Failed to save document: ' + error);
      err.name = 'SaveError';
      throw err;
    }
  }) as AutoSaveFn)
  .build();

/** Health check endpoint */
fastify.get('/health', async (request, reply) => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

/** Generate user info endpoint */
fastify.get('/user', async (request, reply) => {
  return generateUser();
});

/** An example route for websocket collaboration connection */
fastify.register(async function (fastify) {
  fastify.get('/doc/:documentId', { websocket: true }, async (socket, request) => {
    const documentId = (request.params as any).documentId;
    console.log(`WebSocket connection attempt for document: ${documentId}`);

    socket.on('error', (err) => {
      console.error(`WebSocket error for ${documentId}:`, err);
    });

    socket.on('close', (code, reason) => {
      console.log(`WebSocket closed for ${documentId}: code=${code}, reason=${reason?.toString() || 'none'}`);
    });

    try {
      await SuperDocCollaboration.welcome(socket as any, request as any);
      console.log(`WebSocket welcome completed for ${documentId}`);
    } catch (error) {
      console.error(`WebSocket welcome failed for ${documentId}:`, error);
      const err = error as Error;
      const errorHandler = errorHandlers[err.name] || errorHandlers.default;
      errorHandler(err, socket);
    }
  })
});

/** Start the server */
const start = async () => {
  try {
    // Initialize database before starting server
    await initDatabase();

    const port = parseInt(process.env.PORT || '3050');
    const host = '0.0.0.0';

    await fastify.listen({ port, host });
    console.log(`Server running on http://${host}:${port}`);
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

start();