import SQLite from 'react-native-sqlite-storage';

SQLite.enablePromise(true);

let db: Awaited<ReturnType<typeof SQLite.openDatabase>>;

export async function initDatabase(): Promise<void> {
  try {
    db = await SQLite.openDatabase({
      name: 'trofice_validator.db',
      location: 'default',
    });

    await db.executeSql(`
      CREATE TABLE IF NOT EXISTS trips (
        tripId TEXT PRIMARY KEY,
        manifestVersion TEXT,
        etag TEXT,
        tripData TEXT,
        downloadedAt TEXT
      )
    `);

    await db.executeSql(`
      CREATE TABLE IF NOT EXISTS manifest (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tripId TEXT,
        memberId TEXT,
        customerId TEXT,
        uniqueCodeHash TEXT,
        active INTEGER,
        canBoard INTEGER,
        reason TEXT,
        isPAYG INTEGER,
        spendable REAL,
        FOREIGN KEY(tripId) REFERENCES trips(tripId)
      )
    `);

    await db.executeSql(`
      CREATE INDEX IF NOT EXISTS idx_manifest_hash 
      ON manifest(uniqueCodeHash, tripId)
    `);

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}

export async function saveTripPack(
  tripId: string,
  manifestVersion: string,
  tripData: any,
  manifest: any[],
  etag?: string,
): Promise<void> {
  try {
    // Clear existing trip data
    await db.executeSql('DELETE FROM trips WHERE tripId = ?', [tripId]);
    await db.executeSql('DELETE FROM manifest WHERE tripId = ?', [tripId]);

    // Save trip
    await db.executeSql(
      `INSERT INTO trips (tripId, manifestVersion, etag, tripData, downloadedAt) 
       VALUES (?, ?, ?, ?, ?)`,
      [
        tripId,
        manifestVersion,
        etag || '',
        JSON.stringify(tripData),
        new Date().toISOString(),
      ],
    );

    // Save manifest
    for (const member of manifest) {
      await db.executeSql(
        `INSERT INTO manifest 
        (tripId, memberId, customerId, uniqueCodeHash, active, canBoard, reason, isPAYG, spendable) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          tripId,
          member.memberId,
          member.customerId,
          member.uniqueCodeHash || '',
          member.active ? 1 : 0,
          member.canBoard ? 1 : 0,
          member.reason || '',
          member.isPAYG ? 1 : 0,
          member.spendable || 0,
        ],
      );
    }

    console.log(`Trip ${tripId} saved with ${manifest.length} members`);
  } catch (error) {
    console.error('Error saving trip pack:', error);
    throw error;
  }
}

// ✅ Add this function to help debug
export async function getAllManifestForTrip(
  tripId: string,
): Promise<any[] | null> {
  try {
    const [results] = await db.executeSql(
      `SELECT * FROM manifest WHERE tripId = ?`,
      [tripId],
    );

    const passengers = [];
    for (let i = 0; i < results.rows.length; i++) {
      const row = results.rows.item(i);
      passengers.push({
        memberId: row.memberId,
        customerId: row.customerId,
        uniqueCodeHash: row.uniqueCodeHash,
        active: row.active === 1,
        canBoard: row.canBoard === 1,
        reason: row.reason,
        isPAYG: row.isPAYG === 1,
        spendable: row.spendable,
      });
    }

    console.log(`📊 Found ${passengers.length} passengers in database for trip ${tripId}`);
    return passengers;
  } catch (error) {
    console.error('Error getting all manifest:', error);
    return null;
  }
}

// ✅ Also add a debug function to check database contents
export async function debugDatabaseContents(): Promise<void> {
  try {
    // Check trips table
    const [tripResults] = await db.executeSql('SELECT * FROM trips');
    console.log('🗄️ Trips in database:', tripResults.rows.length);
    for (let i = 0; i < tripResults.rows.length; i++) {
      const trip = tripResults.rows.item(i);
      console.log(`   Trip ${i + 1}: ${trip.tripId}`);
    }

    // Check manifest table
    const [manifestResults] = await db.executeSql('SELECT * FROM manifest');
    console.log('🗄️ Manifest entries in database:', manifestResults.rows.length);
    for (let i = 0; i < manifestResults.rows.length; i++) {
      const entry = manifestResults.rows.item(i);
      console.log(`   Entry ${i + 1}:`, {
        tripId: entry.tripId,
        memberId: entry.memberId,
        hash: entry.uniqueCodeHash?.substring(0, 16) + '...',
      });
    }
  } catch (error) {
    console.error('Error debugging database:', error);
  }
}

export async function lookupPassenger(
  tripId: string,
  uniqueCodeHash: string,
): Promise<any | null> {
  try {
    const [results] = await db.executeSql(
      `SELECT * FROM manifest 
       WHERE tripId = ? AND uniqueCodeHash = ? LIMIT 1`,
      [tripId, uniqueCodeHash],
    );

    if (results.rows.length === 0) return null;

    const row = results.rows.item(0);
    return {
      memberId: row.memberId,
      customerId: row.customerId,
      uniqueCodeHash: row.uniqueCodeHash,
      active: row.active === 1,
      canBoard: row.canBoard === 1,
      reason: row.reason,
      isPAYG: row.isPAYG === 1,
      spendable: row.spendable,
    };
  } catch (error) {
    console.error('Error looking up passenger:', error);
    return null;
  }
}

export async function getTripInfo(tripId: string): Promise<any | null> {
  try {
    const [results] = await db.executeSql(
      'SELECT * FROM trips WHERE tripId = ? LIMIT 1',
      [tripId],
    );

    if (results.rows.length === 0) return null;

    const row = results.rows.item(0);
    return {
      tripId: row.tripId,
      manifestVersion: row.manifestVersion,
      etag: row.etag,
      tripData: JSON.parse(row.tripData),
      downloadedAt: row.downloadedAt,
    };
  } catch (error) {
    console.error('Error getting trip info:', error);
    return null;
  }
}

export async function clearTripData(tripId: string): Promise<void> {
  try {
    await db.executeSql('DELETE FROM trips WHERE tripId = ?', [tripId]);
    await db.executeSql('DELETE FROM manifest WHERE tripId = ?', [tripId]);
  } catch (error) {
    console.error('Error clearing trip data:', error);
    throw error;
  }
}