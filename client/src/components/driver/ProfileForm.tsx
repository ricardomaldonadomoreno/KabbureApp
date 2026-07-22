import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export function ProfileForm() {
  const [formData, setFormData] = useState({
    licensePlate: "",
    vehicleMake: "",
    vehicleModel: "",
    vehicleYear: "",
    transportCategory: "",
  });

  const profileQuery = trpc.driver.getProfile.useQuery();
  const createProfileMutation = trpc.driver.createProfile.useMutation({
    onSuccess: () => {
      toast.success("Profile created successfully");
      profileQuery.refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create profile");
    },
  });

  useEffect(() => {
    if (profileQuery.data) {
      setFormData({
        licensePlate: profileQuery.data.licensePlate || "",
        vehicleMake: profileQuery.data.vehicleMake || "",
        vehicleModel: profileQuery.data.vehicleModel || "",
        vehicleYear: profileQuery.data.vehicleYear?.toString() || "",
        transportCategory: profileQuery.data.transportCategory || "",
      });
    }
  }, [profileQuery.data]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.licensePlate) {
      toast.error("License plate is required");
      return;
    }
    createProfileMutation.mutate({
      licensePlate: formData.licensePlate,
      vehicleMake: formData.vehicleMake || undefined,
      vehicleModel: formData.vehicleModel || undefined,
      vehicleYear: formData.vehicleYear ? parseInt(formData.vehicleYear) : undefined,
      transportCategory: formData.transportCategory || undefined,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vehicle Information</CardTitle>
        <CardDescription>Register and manage your vehicle details</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">License Plate *</label>
            <Input
              placeholder="e.g., ABC-1234"
              value={formData.licensePlate}
              onChange={(e) => setFormData({ ...formData, licensePlate: e.target.value.toUpperCase() })}
              className="mt-1"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Vehicle Make</label>
              <Input
                placeholder="e.g., Toyota"
                value={formData.vehicleMake}
                onChange={(e) => setFormData({ ...formData, vehicleMake: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Vehicle Model</label>
              <Input
                placeholder="e.g., Camry"
                value={formData.vehicleModel}
                onChange={(e) => setFormData({ ...formData, vehicleModel: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Vehicle Year</label>
              <Input
                type="number"
                placeholder="e.g., 2023"
                value={formData.vehicleYear}
                onChange={(e) => setFormData({ ...formData, vehicleYear: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Transport Category</label>
              <select
                value={formData.transportCategory}
                onChange={(e) => setFormData({ ...formData, transportCategory: e.target.value })}
                className="w-full px-3 py-2 border rounded-md text-sm mt-1"
              >
                <option value="">Select category</option>
                <option value="car">Car</option>
                <option value="bus">Bus</option>
                <option value="motorcycle">Motorcycle</option>
                <option value="truck">Truck</option>
              </select>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={createProfileMutation.isPending}>
            {createProfileMutation.isPending ? "Saving..." : "Save Vehicle Information"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
