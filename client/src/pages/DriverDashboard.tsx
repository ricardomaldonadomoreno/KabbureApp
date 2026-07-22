import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Truck, Settings, Activity } from "lucide-react";
import { ProfileForm } from "@/components/driver/ProfileForm";
import { RouteSelector } from "@/components/driver/RouteSelector";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";

export default function DriverDashboard() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();


  useEffect(() => {
    if (!loading && user?.role !== "driver") {
      setLocation("/");
    }
  }, [user, loading, setLocation]);

  if (loading || user?.role !== "driver") {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Driver Dashboard</h1>
              <p className="text-muted-foreground mt-2">
                Manage your profile, vehicle, and active routes
              </p>
            </div>
            <Button variant="outline">Settings</Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Quick Status */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Status</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
              <p className="text-xs text-muted-foreground">Check tracking tab</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vehicle</CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
              <p className="text-xs text-muted-foreground">No vehicle assigned</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Route</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
              <p className="text-xs text-muted-foreground">No active route</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="vehicle">Vehicle</TabsTrigger>
            <TabsTrigger value="routes">Routes</TabsTrigger>
            <TabsTrigger value="tracking">Tracking</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Driver Profile</CardTitle>
                <CardDescription>
                  Your personal information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  <div>
                    <label className="text-sm font-medium">Name</label>
                    <div className="mt-1 p-2 border rounded bg-muted">
                      {user?.name || "Not set"}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Email</label>
                    <div className="mt-1 p-2 border rounded bg-muted">
                      {user?.email || "Not set"}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="vehicle" className="space-y-4">
            <ProfileForm />
          </TabsContent>

          <TabsContent value="routes" className="space-y-4">
            <RouteSelector />
          </TabsContent>

          <TabsContent value="tracking" className="space-y-4">
            <RouteSelector />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
