import { z } from "zod";
import { driverProcedure, router, protectedProcedure } from "../_core/trpc";
import {
  createDriver,
  getDriverByUserId,
  updateDriverStatus,
  addGpsLocation,
  getLatestGpsLocation,
  getRoutesByCity,
  getCitiesByCountry,
  getCountries,
} from "../db";

export const driverRouter = router({
  // Get driver profile
  getProfile: driverProcedure.query(async ({ ctx }: any) => {
    return getDriverByUserId(ctx.user.id);
  }),

  // Create or update driver profile
  createProfile: protectedProcedure
    .input(
      z.object({
        licensePlate: z.string(),
        vehicleMake: z.string().optional(),
        vehicleModel: z.string().optional(),
        vehicleYear: z.number().optional(),
        transportCategory: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return createDriver(
        ctx.user.id,
        input.licensePlate,
        input.vehicleMake,
        input.vehicleModel,
        input.vehicleYear,
        input.transportCategory
      );
    }),

  // Update availability
  setAvailability: driverProcedure
    .input(z.object({ isAvailable: z.boolean() }))
    .mutation(async ({ ctx, input }: any) => {
      const driver = await getDriverByUserId(ctx.user.id);
      if (!driver) throw new Error("Driver profile not found");
      return updateDriverStatus(driver.id, undefined, input.isAvailable);
    }),

  // Send GPS location
  sendGpsLocation: driverProcedure
    .input(
      z.object({
        latitude: z.string(),
        longitude: z.string(),
        routeId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }: any) => {
      const driver = await getDriverByUserId(ctx.user.id);
      if (!driver) throw new Error("Driver profile not found");
      return addGpsLocation(
        driver.id,
        input.latitude,
        input.longitude,
        input.routeId
      );
    }),

  // Get latest GPS location
  getLatestLocation: driverProcedure.query(async ({ ctx }: any) => {
    const driver = await getDriverByUserId(ctx.user.id);
    if (!driver) throw new Error("Driver profile not found");
    return getLatestGpsLocation(driver.id);
  }),

  // Get available routes by city
  getRoutesByCity: protectedProcedure
    .input(z.object({ cityId: z.number() }))
    .query(async ({ input }) => {
      return getRoutesByCity(input.cityId);
    }),

  // Get cities by country
  getCitiesByCountry: protectedProcedure
    .input(z.object({ countryId: z.number() }))
    .query(async ({ input }) => {
      return getCitiesByCountry(input.countryId);
    }),

  // Get all countries
  getCountries: protectedProcedure.query(async () => {
    return getCountries();
  }),
});
