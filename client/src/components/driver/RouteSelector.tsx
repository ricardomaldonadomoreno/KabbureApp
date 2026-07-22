import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { MapPin, Navigation } from "lucide-react";

export function RouteSelector() {
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedRoute, setSelectedRoute] = useState("");
  const [isTracking, setIsTracking] = useState(false);

  const countriesQuery = trpc.driver.getCountries.useQuery();
  const citiesQuery = trpc.driver.getCitiesByCountry.useQuery(
    { countryId: parseInt(selectedCountry) },
    { enabled: !!selectedCountry }
  );
  const routesQuery = trpc.driver.getRoutesByCity.useQuery(
    { cityId: parseInt(selectedCity) },
    { enabled: !!selectedCity }
  );

  const setAvailabilityMutation = trpc.driver.setAvailability.useMutation({
    onSuccess: () => {
      toast.success("Availability updated");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update availability");
    },
  });

  const sendGpsLocationMutation = trpc.driver.sendGpsLocation.useMutation({
    onSuccess: () => {
      // GPS location sent successfully (silent update)
    },
    onError: (error) => {
      console.error("Failed to send GPS location:", error);
    },
  });

  // Start GPS tracking
  useEffect(() => {
    if (!isTracking) return;

    const interval = setInterval(() => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            sendGpsLocationMutation.mutate({
              latitude: position.coords.latitude.toString(),
              longitude: position.coords.longitude.toString(),
              routeId: selectedRoute ? parseInt(selectedRoute) : undefined,
            });
          },
          (error) => {
            console.error("Geolocation error:", error);
          }
        );
      }
    }, 5000); // Send GPS every 5 seconds

    return () => clearInterval(interval);
  }, [isTracking, selectedRoute, sendGpsLocationMutation]);

  const handleStartTracking = () => {
    if (!selectedRoute) {
      toast.error("Please select a route first");
      return;
    }
    setIsTracking(true);
    setAvailabilityMutation.mutate({ isAvailable: true });
    toast.success("GPS tracking started");
  };

  const handleStopTracking = () => {
    setIsTracking(false);
    setAvailabilityMutation.mutate({ isAvailable: false });
    toast.success("GPS tracking stopped");
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Select Route</CardTitle>
          <CardDescription>Choose your country, city, and route</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Country</label>
            <select
              value={selectedCountry}
              onChange={(e) => {
                setSelectedCountry(e.target.value);
                setSelectedCity("");
                setSelectedRoute("");
              }}
              className="w-full px-3 py-2 border rounded-md text-sm mt-1"
            >
              <option value="">Select a country</option>
              {countriesQuery.data?.map((country: any) => (
                <option key={country.id} value={country.id}>
                  {country.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">City</label>
            <select
              value={selectedCity}
              onChange={(e) => {
                setSelectedCity(e.target.value);
                setSelectedRoute("");
              }}
              disabled={!selectedCountry}
              className="w-full px-3 py-2 border rounded-md text-sm mt-1 disabled:opacity-50"
            >
              <option value="">Select a city</option>
              {citiesQuery.data?.map((city: any) => (
                <option key={city.id} value={city.id}>
                  {city.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Route</label>
            <select
              value={selectedRoute}
              onChange={(e) => setSelectedRoute(e.target.value)}
              disabled={!selectedCity}
              className="w-full px-3 py-2 border rounded-md text-sm mt-1 disabled:opacity-50"
            >
              <option value="">Select a route</option>
              {routesQuery.data?.map((route: any) => (
                <option key={route.id} value={route.id}>
                  {route.name} {route.direction ? `(${route.direction})` : ""}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>GPS Tracking</CardTitle>
          <CardDescription>
            {isTracking
              ? "GPS tracking is active. Your location is being sent every 5 seconds."
              : "Start a route to begin GPS tracking"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 border rounded-lg bg-muted">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant={isTracking ? "default" : "secondary"}>
                {isTracking ? "Tracking Active" : "Tracking Inactive"}
              </Badge>
            </div>
            {selectedRoute && (
              <div className="text-sm text-muted-foreground">
                <p className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Route selected and ready to track
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleStartTracking}
              disabled={isTracking || !selectedRoute}
              className="flex-1"
            >
              <Navigation className="h-4 w-4 mr-2" />
              Start Tracking
            </Button>
            <Button
              onClick={handleStopTracking}
              disabled={!isTracking}
              variant="outline"
              className="flex-1"
            >
              Stop Tracking
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
