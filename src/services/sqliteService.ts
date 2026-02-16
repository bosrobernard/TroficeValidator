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

// ✅ NEW: Update manifest with differential changes
export async function updateManifestDiff(
  tripId: string,
  newManifestVersion: string,
  newManifest: any[],
): Promise<{ added: number; updated: number; removed: number }> {
  let added = 0;
  let updated = 0;
  let removed = 0;

  try {
    await db.executeSql('BEGIN TRANSACTION');

    // Get existing manifest entries for this trip
    const [existingResults] = await db.executeSql(
      'SELECT uniqueCodeHash, memberId, active, canBoard, reason, isPAYG, spendable FROM manifest WHERE tripId = ?',
      [tripId],
    );

    // Create a map of existing entries by uniqueCodeHash
    const existingMap = new Map();
    for (let i = 0; i < existingResults.rows.length; i++) {
      const entry = existingResults.rows.item(i);
      existingMap.set(entry.uniqueCodeHash, {
        memberId: entry.memberId,
        active: entry.active,
        canBoard: entry.canBoard,
        reason: entry.reason,
        isPAYG: entry.isPAYG,
        spendable: entry.spendable,
      });
    }

    // Create a set of new hashes for tracking
    const newHashes = new Set<string>();

    // Process new manifest entries
    for (const passenger of newManifest) {
      const codeHash = passenger.uniqueCodeHash;
      newHashes.add(codeHash);

      const existing = existingMap.get(codeHash);

      if (!existing) {
        // New passenger - insert
        await db.executeSql(
          `INSERT INTO manifest (
            tripId, memberId, customerId, uniqueCodeHash, 
            active, canBoard, reason, isPAYG, spendable
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            tripId,
            passenger.memberId,
            passenger.customerId,
            codeHash,
            passenger.active ? 1 : 0,
            passenger.canBoard ? 1 : 0,
            passenger.reason || '',
            passenger.isPAYG ? 1 : 0,
            passenger.spendable || 0,
          ],
        );
        added++;
        console.log(`➕ [ManifestDiff] Added: ${passenger.fullname || passenger.memberId}`);
      } else {
        // Check if any fields changed
        const activeInt = passenger.active ? 1 : 0;
        const canBoardInt = passenger.canBoard ? 1 : 0;
        const isPAYGInt = passenger.isPAYG ? 1 : 0;
        const reasonStr = passenger.reason || '';

        const hasChanges =
          existing.active !== activeInt ||
          existing.canBoard !== canBoardInt ||
          existing.reason !== reasonStr ||
          existing.isPAYG !== isPAYGInt ||
          Math.abs(existing.spendable - (passenger.spendable || 0)) > 0.01;

        if (hasChanges) {
          // Update existing passenger
          await db.executeSql(
            `UPDATE manifest SET 
              active = ?, 
              canBoard = ?, 
              reason = ?, 
              isPAYG = ?, 
              spendable = ?
            WHERE tripId = ? AND uniqueCodeHash = ?`,
            [
              activeInt,
              canBoardInt,
              reasonStr,
              isPAYGInt,
              passenger.spendable || 0,
              tripId,
              codeHash,
            ],
          );
          updated++;
          console.log(`✏️ [ManifestDiff] Updated: ${passenger.fullname || passenger.memberId}`, {
            canBoard: `${existing.canBoard} → ${canBoardInt}`,
            spendable: `${existing.spendable} → ${passenger.spendable}`,
            reason: passenger.reason || 'none',
          });
        }
      }
    }

    // Remove passengers that are no longer in the new manifest
    for (const [hash, entry] of existingMap) {
      if (!newHashes.has(hash)) {
        await db.executeSql(
          'DELETE FROM manifest WHERE tripId = ? AND uniqueCodeHash = ?',
          [tripId, hash],
        );
        removed++;
        console.log(`➖ [ManifestDiff] Removed: ${entry.memberId}`);
      }
    }

    // Update trip manifest version
    await db.executeSql(
      'UPDATE trips SET manifestVersion = ? WHERE tripId = ?',
      [newManifestVersion, tripId],
    );

    await db.executeSql('COMMIT');

    console.log(`✅ [ManifestDiff] Changes: +${added} ~${updated} -${removed}`);
    
    return { added, updated, removed };
  } catch (error) {
    await db.executeSql('ROLLBACK');
    console.error('❌ [ManifestDiff] Failed:', error);
    throw error;
  }
}

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