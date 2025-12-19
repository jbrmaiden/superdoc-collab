import pg from 'pg';
import { Doc as YDoc, encodeStateAsUpdate } from 'yjs';
import type { StorageFunction } from './storage-types.js';

const { Pool } = pg;

// Create connection pool - uses DATABASE_URL from environment
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Create a blank Y.Doc with minimal DOCX structure that SuperDoc expects
function createBlankDocxState(): Uint8Array {
  const blankDoc = new YDoc();
  const metaMap = blankDoc.getMap('meta');
  metaMap.set('docx', []);
  return encodeStateAsUpdate(blankDoc);
}

/**
 * Initialize database table for document storage
 */
export async function initDatabase(): Promise<void> {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        state BYTEA NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

/**
 * Load document state from PostgreSQL
 */
export const loadDocument: StorageFunction = async (id: string) => {
  try {
    const result = await pool.query(
      'SELECT state FROM documents WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      console.log(`Document ${id} not found, creating blank DOCX structure`);
      return createBlankDocxState(); // Return empty DOCX structure for SuperDoc
    }

    console.log(`Loaded document ${id} from database`);
    return new Uint8Array(result.rows[0].state);
  } catch (error) {
    console.error(`Failed to load document ${id}:`, error);
    throw error;
  }
};

/**
 * Save document state to PostgreSQL
 */
export const saveDocument: StorageFunction = async (id: string, state?: Uint8Array) => {
  if (!state) {
    console.warn(`No state provided for document ${id}`);
    return false;
  }

  try {
    await pool.query(`
      INSERT INTO documents (id, state, updated_at)
      VALUES ($1, $2, CURRENT_TIMESTAMP)
      ON CONFLICT (id)
      DO UPDATE SET state = $2, updated_at = CURRENT_TIMESTAMP
    `, [id, Buffer.from(state)]);

    console.log(`Saved document ${id} to database`);
    return true;
  } catch (error) {
    console.error(`Failed to save document ${id}:`, error);
    throw error;
  }
};
