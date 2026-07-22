import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Power, PowerOff } from "lucide-react";

export function DriversManager() {
  const driversQuery = trpc.admin.getActiveDrivers.useQuery();

  const updateDriverStatusMutation = trpc.admin.updateDriverStatus.useMutation({
    onSuccess: () => {
      toast.success("Driver status updated");
      driversQuery.refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update driver status");
    },
  });

  const handleToggleDriver = (driverId: number, isActive: boolean) => {
    updateDriverStatusMutation.mutate({
      driverId,
      isActive: !isActive,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Drivers Management</CardTitle>
        <CardDescription>View and manage registered drivers</CardDescription>
      </CardHeader>
      <CardContent>
        {driversQuery.isLoading ? (
          <div className="text-center text-muted-foreground py-8">Loading drivers...</div>
        ) : driversQuery.data && driversQuery.data.length > 0 ? (
          <div className="space-y-3">
            {driversQuery.data.map((driver: any) => (
              <div key={driver.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <h3 className="font-semibold">{driver.licensePlate}</h3>
                  <div className="flex gap-2 mt-2">
                    <Badge variant={driver.isActive ? "default" : "secondary"}>
                      {driver.isActive ? "Active" : "Inactive"}
                    </Badge>
                    <Badge variant={driver.isAvailable ? "default" : "outline"}>
                      {driver.isAvailable ? "Available" : "Unavailable"}
                    </Badge>
                    {driver.transportCategory && (
                      <Badge variant="outline">{driver.transportCategory}</Badge>
                    )}
                  </div>
                  {driver.vehicleMake && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {driver.vehicleMake} {driver.vehicleModel} {driver.vehicleYear && `(${driver.vehicleYear})`}
                    </p>
                  )}
                </div>
                <Button
                  variant={driver.isActive ? "destructive" : "default"}
                  size="sm"
                  onClick={() => handleToggleDriver(driver.id, driver.isActive)}
                  disabled={updateDriverStatusMutation.isPending}
                >
                  {driver.isActive ? (
                    <>
                      <PowerOff className="h-4 w-4 mr-2" />
                      Deactivate
                    </>
                  ) : (
                    <>
                      <Power className="h-4 w-4 mr-2" />
                      Activate
                    </>
                  )}
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-8">
            No drivers registered yet. Drivers will appear here once they sign up.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
