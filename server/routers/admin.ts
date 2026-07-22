import { z } from "zod";
import { adminProcedure, router } from "../_core/trpc";
import {
  createCountry,
  getCountries,
  createCity,
  getCitiesByCountry,
  createRoute,
  getRoutesByCity,
  getActiveDrivers,
  updateDriverStatus,
} from "../db";
import { calculateCentroid, isValidGeoJSON } from "../utils/geojson";

export const adminRouter = router({
  // Countries
  createCountry: adminProcedure
    .input(z.object({ name: z.string(), code: z.string() }))
    .mutation(async ({ input }) => {
      return createCountry(input.name, input.code);
    }),

  getCountries: adminProcedure.query(async () => {
    return getCountries();
  }),

  // Cities
  createCity: adminProcedure
    .input(z.object({ name: z.string(), countryId: z.number() }))
    .mutation(async ({ input }) => {
      return createCity(input.name, input.countryId);
    }),

  getCitiesByCountry: adminProcedure
    .input(z.object({ countryId: z.number() }))
    .query(async ({ input }) => {
      return getCitiesByCountry(input.countryId);
    }),

  // Routes
  createRoute: adminProcedure
    .input(
      z.object({
        name: z.string(),
        cityId: z.number(),
        geojson: z.string(),
        centroid: z.string().optional(),
        direction: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Validate and parse GeoJSON
      let geojsonObj;
      try {
        geojsonObj = JSON.parse(input.geojson);
        if (!isValidGeoJSON(geojsonObj)) {
          throw new Error("Invalid GeoJSON structure");
        }
      } catch (error) {
        throw new Error(
          "Invalid GeoJSON: " + (error instanceof Error ? error.message : "Unknown error")
        );
      }

      // Calculate centroid if not provided
      let centroid = input.centroid;
      if (!centroid) {
        const centroidPoint = calculateCentroid(geojsonObj);
        centroid = JSON.stringify(centroidPoint);
      }

      return createRoute(
        input.name,
        input.cityId,
        input.geojson,
        centroid,
        input.direction
      );
    }),

  getRoutesByCity: adminProcedure
    .input(z.object({ cityId: z.number() }))
    .query(async ({ input }) => {
      return getRoutesByCity(input.cityId);
    }),

  // Drivers
  getActiveDrivers: adminProcedure.query(async () => {
    return getActiveDrivers();
  }),

  updateDriverStatus: adminProcedure
    .input(
      z.object({
        driverId: z.number(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return updateDriverStatus(input.driverId, input.isActive);
    }),
});
