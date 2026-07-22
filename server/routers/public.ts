import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { getRoutesByCity, getCitiesByCountry, getCountries, getActiveDrivers, getLatestGpsLocation } from "../db";

export const publicRouter = router({
  // Get all countries
  getCountries: publicProcedure.query(async () => {
    return getCountries();
  }),

  // Get cities by country
  getCitiesByCountry: publicProcedure
    .input(z.object({ countryId: z.number() }))
    .query(async ({ input }) => {
      return getCitiesByCountry(input.countryId);
    }),

  // Get routes by city
  getRoutesByCity: publicProcedure
    .input(z.object({ cityId: z.number() }))
    .query(async ({ input }) => {
      return getRoutesByCity(input.cityId);
    }),

  // Get active drivers
  getActiveDrivers: publicProcedure.query(async () => {
    return getActiveDrivers();
  }),

  // Get driver location
  getDriverLocation: publicProcedure
    .input(z.object({ driverId: z.number() }))
    .query(async ({ input }) => {
      return getLatestGpsLocation(input.driverId);
    }),
});
