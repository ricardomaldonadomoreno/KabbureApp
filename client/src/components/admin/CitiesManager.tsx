import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export function CitiesManager() {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", countryId: "" });

  const countriesQuery = trpc.admin.getCountries.useQuery();
  const citiesQuery = trpc.admin.getCitiesByCountry.useQuery(
    { countryId: parseInt(formData.countryId) },
    { enabled: !!formData.countryId }
  );

  const createCityMutation = trpc.admin.createCity.useMutation({
    onSuccess: () => {
      toast.success("City created successfully");
      citiesQuery.refetch();
      setFormData({ name: "", countryId: formData.countryId });
      setIsOpen(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create city");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.countryId) {
      toast.error("Please fill in all fields");
      return;
    }
    createCityMutation.mutate({
      name: formData.name,
      countryId: parseInt(formData.countryId),
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cities Management</CardTitle>
        <CardDescription>Add and manage cities within countries</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add City
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New City</DialogTitle>
              <DialogDescription>Create a new city within a country</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Country</label>
                <select
                  value={formData.countryId}
                  onChange={(e) => setFormData({ ...formData, countryId: e.target.value })}
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
                <label className="text-sm font-medium">City Name</label>
                <Input
                  placeholder="e.g., New York"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1"
                />
              </div>
              <Button type="submit" className="w-full" disabled={createCityMutation.isPending}>
                {createCityMutation.isPending ? "Creating..." : "Create City"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {citiesQuery.isLoading ? (
          <div className="text-center text-muted-foreground">Loading cities...</div>
        ) : citiesQuery.data && citiesQuery.data.length > 0 ? (
          <div className="space-y-2">
            {citiesQuery.data.map((city: any) => (
              <div key={city.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{city.name}</p>
                </div>
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-8">
            {formData.countryId
              ? "No cities added yet. Create your first city."
              : "Select a country to view its cities."}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
