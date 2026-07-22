import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { cities, countries, drivers, gpsLocations, InsertUser, routes, settings, subscriptions, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// --- Country Helpers ---
export async function createCountry(name: string, code: string) {
  const db = await getDb();
  if (!db) return;
  return db.insert(countries).values({ name, code });
}

export async function getCountries() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(countries);
}

// --- City Helpers ---
export async function createCity(name: string, countryId: number) {
  const db = await getDb();
  if (!db) return;
  return db.insert(cities).values({ name, countryId });
}

export async function getCitiesByCountry(countryId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(cities).where(eq(cities.countryId, countryId));
}

// --- Route Helpers ---
export async function createRoute(name: string, cityId: number, geojson: string, centroid: string, direction?: string) {
  const db = await getDb();
  if (!db) return;
  return db.insert(routes).values({ name, cityId, geojson, centroid, direction });
}

export async function getRoutesByCity(cityId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(routes).where(eq(routes.cityId, cityId));
}

// --- Driver Helpers ---
export async function createDriver(userId: number, licensePlate: string, vehicleMake?: string, vehicleModel?: string, vehicleYear?: number, transportCategory?: string) {
  const db = await getDb();
  if (!db) return;
  return db.insert(drivers).values({ userId, licensePlate, vehicleMake, vehicleModel, vehicleYear, transportCategory });
}

export async function getDriverByUserId(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(drivers).where(eq(drivers.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateDriverStatus(driverId: number, isActive?: boolean, isAvailable?: boolean) {
  const db = await getDb();
  if (!db) return;
  const updateSet: Record<string, unknown> = {};
  if (isActive !== undefined) updateSet.isActive = isActive;
  if (isAvailable !== undefined) updateSet.isAvailable = isAvailable;
  if (Object.keys(updateSet).length === 0) return; // No updates to perform
  return db.update(drivers).set(updateSet).where(eq(drivers.id, driverId));
}

export async function getActiveDrivers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(drivers).where(eq(drivers.isActive, true));
}

// --- GPS Location Helpers ---
export async function addGpsLocation(driverId: number, latitude: string, longitude: string, routeId?: number) {
  const db = await getDb();
  if (!db) return;
  return db.insert(gpsLocations).values({ driverId, latitude, longitude, routeId });
}

export async function getLatestGpsLocation(driverId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(gpsLocations).where(eq(gpsLocations.driverId, driverId)).orderBy(gpsLocations.timestamp).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// --- Subscription Helpers ---
export async function createSubscription(userId: number, planName: string, endDate?: Date) {
  const db = await getDb();
  if (!db) return;
  return db.insert(subscriptions).values({ userId, planName, endDate });
}

// --- Settings Helpers ---
export async function setSetting(key: string, value: string) {
  const db = await getDb();
  if (!db) return;
  return db.insert(settings).values({ key, value }).onDuplicateKeyUpdate({ set: { value } });
}

export async function getSetting(key: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}
