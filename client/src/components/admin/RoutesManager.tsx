import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Upload } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export function RoutesManager() {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", cityId: "", direction: "", geojsonFile: null as File | null });

  const citiesQuery = trpc.admin.getCountries.useQuery();
  const routesQuery = trpc.admin.getRoutesByCity.useQuery(
    { cityId: parseInt(formData.cityId) },
    { enabled: !!formData.cityId }
  );

  const createRouteMutation = trpc.admin.createRoute.useMutation({
    onSuccess: () => {
      toast.success("Route created successfully");
      routesQuery.refetch();
      setFormData({ name: "", cityId: formData.cityId, direction: "", geojsonFile: null });
      setIsOpen(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create route");
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({ ...formData, geojsonFile: file });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.cityId || !formData.geojsonFile) {
      toast.error("Please fill in all fields and select a GeoJSON file");
      return;
    }

    try {
      const text = await formData.geojsonFile.text();
      const geojson = JSON.parse(text);

      // Calculate centroid from GeoJSON
      let centroid = { type: "Point", coordinates: [0, 0] };
      if (geojson.type === "FeatureCollection" && geojson.features.length > 0) {
        const feature = geojson.features[0];
        if (feature.geometry.type === "LineString") {
          const coords = feature.geometry.coordinates;
          const midpoint = coords[Math.floor(coords.length / 2)];
          centroid.coordinates = midpoint;
        }
      }

      createRouteMutation.mutate({
        name: formData.name,
        cityId: parseInt(formData.cityId),
        geojson: JSON.stringify(geojson),
        centroid: JSON.stringify(centroid),
        direction: formData.direction || undefined,
      });
    } catch (error) {
      toast.error("Invalid GeoJSON file");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Routes Management</CardTitle>
        <CardDescription>Import and manage GeoJSON routes</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Import Route (GeoJSON)
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Import New Route</DialogTitle>
              <DialogDescription>Upload a GeoJSON file to create a new route</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium">City</label>
                <select
                  value={formData.cityId}
                  onChange={(e) => setFormData({ ...formData, cityId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md text-sm mt-1"
                >
                  <option value="">Select a city</option>
                  {/* TODO: Fetch cities from selected country */}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Route Name</label>
                <Input
                  placeholder="e.g., Downtown Express"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Direction (Optional)</label>
                <Input
                  placeholder="e.g., North, Inbound"
                  value={formData.direction}
                  onChange={(e) => setFormData({ ...formData, direction: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">GeoJSON File</label>
                <div className="mt-1 flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="h-6 w-6 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        {formData.geojsonFile ? formData.geojsonFile.name : "Click to upload GeoJSON"}
                      </p>
                    </div>
                    <input type="file" accept=".geojson,.json" onChange={handleFileChange} className="hidden" />
                  </label>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={createRouteMutation.isPending}>
                {createRouteMutation.isPending ? "Importing..." : "Import Route"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {routesQuery.isLoading ? (
          <div className="text-center text-muted-foreground">Loading routes...</div>
        ) : routesQuery.data && routesQuery.data.length > 0 ? (
          <div className="space-y-2">
            {routesQuery.data.map((route: any) => (
              <div key={route.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{route.name}</p>
                  {route.direction && <p className="text-sm text-muted-foreground">{route.direction}</p>}
                </div>
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-8">
            {formData.cityId
              ? "No routes imported yet. Upload a GeoJSON file to create routes."
              : "Select a city to view its routes."}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
