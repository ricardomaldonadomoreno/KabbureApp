import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MapPin, Navigation, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

export default function UserMap() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string>("");
  const [selectedCity, setSelectedCity] = useState<string>("");

  const countriesQuery = trpc.public.getCountries.useQuery();
  const citiesQuery = trpc.public.getCitiesByCountry.useQuery(
    { countryId: parseInt(selectedCountry) },
    { enabled: !!selectedCountry }
  );
  const routesQuery = trpc.public.getRoutesByCity.useQuery(
    { cityId: parseInt(selectedCity) },
    { enabled: !!selectedCity }
  );
  const driversQuery = trpc.public.getActiveDrivers.useQuery();

  useEffect(() => {
    if (!loading && isAuthenticated && user?.role !== "user") {
      // Redirect non-users to their respective dashboards
      if (user?.role === "admin") {
        setLocation("/admin/dashboard");
      } else if (user?.role === "driver") {
        setLocation("/driver/dashboard");
      }
    }
  }, [isAuthenticated, user, loading, setLocation]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Live Mobility Map</h1>
            <p className="text-sm text-muted-foreground">
              View active routes and nearby drivers
            </p>
          </div>
          {isAuthenticated && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {user?.name || user?.email}
              </span>
              <Button variant="outline" size="sm">
                Menu
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid gap-6 lg:grid-cols-4">
          {/* Sidebar - Search and Filters */}
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Search</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Country</label>
                  <select
                    value={selectedCountry}
                    onChange={(e) => {
                      setSelectedCountry(e.target.value);
                      setSelectedCity("");
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
                    onChange={(e) => setSelectedCity(e.target.value)}
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

                <Button className="w-full">Search</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Filters</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Distance</label>
                  <Input type="range" min="0" max="50" defaultValue="10" />
                  <span className="text-xs text-muted-foreground">Within 10 km</span>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Transport Type</label>
                  <select className="w-full px-3 py-2 border rounded-md text-sm">
                    <option>All Types</option>
                    <option>Car</option>
                    <option>Bus</option>
                    <option>Motorcycle</option>
                  </select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Your Location</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full">
                  <Navigation className="h-4 w-4 mr-2" />
                  Use Current Location
                </Button>
                <div className="text-xs text-muted-foreground">
                  <p>Latitude: -</p>
                  <p>Longitude: -</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Map Area */}
          <div className="lg:col-span-3 space-y-4">
            <Card className="h-96 lg:h-full">
              <CardContent className="h-full flex items-center justify-center">
                <div className="text-center">
                  <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Interactive map will be displayed here
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Powered by React Leaflet
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Routes List */}
            <Card>
              <CardHeader>
                <CardTitle>Nearby Routes</CardTitle>
                <CardDescription>
                  Active routes in your area
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {routesQuery.data && routesQuery.data.length > 0 ? (
                    routesQuery.data.map((route: any) => (
                      <div
                        key={route.id}
                        className="p-4 border rounded-lg hover:bg-muted cursor-pointer transition"
                        onClick={() => setSelectedRoute(`route-${route.id}`)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold">{route.name}</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              {driversQuery.data?.length || 0} active drivers
                            </p>
                            {route.direction && (
                              <div className="flex items-center gap-4 mt-2 text-sm">
                                <span className="flex items-center gap-1">
                                  <Navigation className="h-4 w-4" />
                                  Direction: {route.direction}
                                </span>
                              </div>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant={selectedRoute === `route-${route.id}` ? "default" : "outline"}
                          >
                            View
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-muted-foreground py-4">
                      {selectedCity ? "No routes available" : "Select a city to view routes"}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Active Drivers */}
            <Card>
              <CardHeader>
                <CardTitle>Active Drivers</CardTitle>
                <CardDescription>
                  Drivers currently online
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {driversQuery.data && driversQuery.data.length > 0 ? (
                    driversQuery.data.map((driver: any) => (
                      <div key={driver.id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold">{driver.licensePlate}</h3>
                            <p className="text-sm text-muted-foreground">
                              {driver.transportCategory || "Vehicle"}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {driver.vehicleMake} {driver.vehicleModel}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-semibold">
                              <span className="w-2 h-2 bg-green-600 rounded-full"></span>
                              Online
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-muted-foreground py-4">
                      No active drivers at the moment
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
