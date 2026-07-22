import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export function CountriesManager() {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", code: "" });

  const countriesQuery = trpc.admin.getCountries.useQuery();
  const createCountryMutation = trpc.admin.createCountry.useMutation({
    onSuccess: () => {
      toast.success("Country created successfully");
      countriesQuery.refetch();
      setFormData({ name: "", code: "" });
      setIsOpen(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create country");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.code) {
      toast.error("Please fill in all fields");
      return;
    }
    createCountryMutation.mutate(formData);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Countries Management</CardTitle>
        <CardDescription>Add and manage countries for your platform</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Country
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Country</DialogTitle>
              <DialogDescription>Create a new country for your platform</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Country Name</label>
                <Input
                  placeholder="e.g., United States"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Country Code</label>
                <Input
                  placeholder="e.g., US"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="mt-1"
                  maxLength={2}
                />
              </div>
              <Button type="submit" className="w-full" disabled={createCountryMutation.isPending}>
                {createCountryMutation.isPending ? "Creating..." : "Create Country"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {countriesQuery.isLoading ? (
          <div className="text-center text-muted-foreground">Loading countries...</div>
        ) : countriesQuery.data && countriesQuery.data.length > 0 ? (
          <div className="space-y-2">
            {countriesQuery.data.map((country: any) => (
              <div key={country.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{country.name}</p>
                  <p className="text-sm text-muted-foreground">{country.code}</p>
                </div>
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-8">
            No countries added yet. Create your first country to get started.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
