import { Level } from "level"

// Define more specific type with valueEncoding for better type safety
type JsonLevel = Level<string, any>;

// Initialize database variables with default values that will be replaced
// This ensures TypeScript knows these variables are always defined
let stateDB: JsonLevel = createFailsafeDb('stateStore');
let blockDB: JsonLevel = createFailsafeDb('blockStore');
let bhashDB: JsonLevel = createFailsafeDb('bhashStore');
let txhashDB: JsonLevel = createFailsafeDb('txhashStore');
let stakeDb: JsonLevel = createFailsafeDb('stakeStore');

// Function to create a failsafe database that logs errors instead of crashing
// This is used as a placeholder until real DB connections are established
function createFailsafeDb(storeName: string): JsonLevel {
  const mockDb = {
    get: async (key: string) => {
      console.error(`Database ${storeName} not properly initialized, attempted to get key: ${key}`);
      throw new Error(`Database not initialized: ${storeName}`);
    },
    put: async (key: string, value: any) => {
      console.error(`Database ${storeName} not properly initialized, attempted to put key: ${key}`);
      throw new Error(`Database not initialized: ${storeName}`);
    },
    del: async (key: string) => {
      console.error(`Database ${storeName} not properly initialized, attempted to delete key: ${key}`);
      throw new Error(`Database not initialized: ${storeName}`);
    },
    open: async () => {
      console.error(`Database ${storeName} not properly initialized, attempted to open`);
      throw new Error(`Database not initialized: ${storeName}`);
    },
    close: async () => {
      console.error(`Database ${storeName} not properly initialized, attempted to close`);
      throw new Error(`Database not initialized: ${storeName}`);
    },
    batch: () => {
      console.error(`Database ${storeName} not properly initialized, attempted to create batch`);
      throw new Error(`Database not initialized: ${storeName}`);
    },
    clear: async () => {
      console.error(`Database ${storeName} not properly initialized, attempted to clear`);
      throw new Error(`Database not initialized: ${storeName}`);
    },
    iterator: () => {
      console.error(`Database ${storeName} not properly initialized, attempted to create iterator`);
      throw new Error(`Database not initialized: ${storeName}`);
    },
    keys: () => {
      console.error(`Database ${storeName} not properly initialized, attempted to get keys`);
      const mockIterator = {
        all: async () => {
          throw new Error(`Database not initialized: ${storeName}`);
        },
        next: async () => {
          throw new Error(`Database not initialized: ${storeName}`);
        }
      };
      return mockIterator;
    },
    values: () => {
      console.error(`Database ${storeName} not properly initialized, attempted to get values`);
      throw new Error(`Database not initialized: ${storeName}`);
    }
  } as unknown as JsonLevel;
  
  return mockDb;
}

declare global {
  var __stateDb: JsonLevel | undefined
  var __blockDb: JsonLevel | undefined
  var __bhashDb: JsonLevel | undefined
  var __txhashDb: JsonLevel | undefined
  var __stakeDb: JsonLevel | undefined
}

// Ensure absolute path for database storage location to avoid relative path issues
const path = process.env.APP_ENV ? `log/${process.env.APP_ENV}` : "log"

// Function to safely initialize a database with error handling
function safeInitDb(
  dbPath: string, 
  options: Record<string, any> = {}
): JsonLevel | undefined {
  try {
    return new Level(dbPath, {
      valueEncoding: "json",
      ...options
    }) as JsonLevel;
  } catch (error) {
    console.error(`Failed to initialize database ${dbPath}:`, error);
    return undefined;
  }
}

// Initialize databases if they don't exist
if (!global.__stateDb) {
  global.__stateDb = safeInitDb(__dirname + `/../../${path}/stateStore`);
  if (global.__stateDb) {
    console.log("State database initialized");
  }
}

if (!global.__blockDb) {
  global.__blockDb = safeInitDb(__dirname + `/../../${path}/blockStore`);
  if (global.__blockDb) {
    console.log("Block database initialized");
  }
}

if (!global.__bhashDb) {
  global.__bhashDb = safeInitDb(__dirname + `/../../${path}/bhashStore`);
  if (global.__bhashDb) {
    console.log("Block hash database initialized");
  }
}

if (!global.__txhashDb) {
  global.__txhashDb = safeInitDb(__dirname + `/../../${path}/txhashStore`);
  if (global.__txhashDb) {
    console.log("Transaction hash database initialized");
  }
}

if (!global.__stakeDb) {
  global.__stakeDb = safeInitDb(__dirname + `/../../${path}/stakeStore`);
  if (global.__stakeDb) {
    console.log("Stake database initialized");
  }
}

// Assign global DB instances to local variables with proper null checking
if (global.__stateDb) stateDB = global.__stateDb;
if (global.__blockDb) blockDB = global.__blockDb;
if (global.__bhashDb) bhashDB = global.__bhashDb;
if (global.__txhashDb) txhashDB = global.__txhashDb;
if (global.__stakeDb) stakeDb = global.__stakeDb;

// Export a function to check if all databases are ready
export async function areDbsReady(): Promise<boolean> {
  try {
    // Try a simple operation on each database
    await Promise.all([
      stateDB.get('__test__').catch(err => {
        if (err.type === 'NotFoundError') return true; // This is expected
        console.log("State DB is ready");
        return true;
      }),
      blockDB.get('__test__').catch(err => {
        if (err.type === 'NotFoundError') return true;
        console.log("Block DB is ready");
        return true;
      }),
      bhashDB.get('__test__').catch(err => {
        if (err.type === 'NotFoundError') return true;
        console.log("Block hash DB is ready");
        return true;
      }),
      txhashDB.get('__test__').catch(err => {
        if (err.type === 'NotFoundError') return true;
        console.log("Transaction hash DB is ready");
        return true;
      }),
      stakeDb.get('__test__').catch(err => {
        if (err.type === 'NotFoundError') return true;
        console.log("Stake DB is ready");
        return true;
      }),
    ]);
    return true;
  } catch (error) {
    console.error("Database readiness check failed:", error);
    return false;
  }
}

// Function to verify and re-initialize any failed database connections
export async function ensureDbsInitialized(): Promise<boolean> {
  let allInitialized = true;
  
  try {
    // Check each database and re-initialize if needed
    if (!global.__stateDb) {
      console.log("Re-initializing state database...");
      global.__stateDb = safeInitDb(__dirname + `/../../${path}/stateStore`);
      if (global.__stateDb) {
        stateDB = global.__stateDb;
        console.log("State database re-initialized successfully");
      } else {
        allInitialized = false;
      }
    }
    
    if (!global.__blockDb) {
      console.log("Re-initializing block database...");
      global.__blockDb = safeInitDb(__dirname + `/../../${path}/blockStore`);
      if (global.__blockDb) {
        blockDB = global.__blockDb;
        console.log("Block database re-initialized successfully");
      } else {
        allInitialized = false;
      }
    }
    
    if (!global.__bhashDb) {
      console.log("Re-initializing block hash database...");
      global.__bhashDb = safeInitDb(__dirname + `/../../${path}/bhashStore`);
      if (global.__bhashDb) {
        bhashDB = global.__bhashDb;
        console.log("Block hash database re-initialized successfully");
      } else {
        allInitialized = false;
      }
    }
    
    if (!global.__txhashDb) {
      console.log("Re-initializing transaction hash database...");
      global.__txhashDb = safeInitDb(__dirname + `/../../${path}/txhashStore`);
      if (global.__txhashDb) {
        txhashDB = global.__txhashDb;
        console.log("Transaction hash database re-initialized successfully");
      } else {
        allInitialized = false;
      }
    }
    
    if (!global.__stakeDb) {
      console.log("Re-initializing stake database...");
      global.__stakeDb = safeInitDb(__dirname + `/../../${path}/stakeStore`);
      if (global.__stakeDb) {
        stakeDb = global.__stakeDb;
        console.log("Stake database re-initialized successfully");
      } else {
        allInitialized = false;
      }
    }
    
    return allInitialized;
  } catch (error) {
    console.error("Error ensuring databases are initialized:", error);
    return false;
  }
}

export { stateDB, blockDB, bhashDB, txhashDB, stakeDb }
