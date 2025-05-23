import { useState } from 'react';
import { useLocation } from 'wouter';
import { Caterer, useCaterers, useDeleteCaterer } from '../../hooks/use-caterers';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow
} from '../../components/ui/table';
import {
  ChefHat, Plus, Search, Edit, Trash2,
  CreditCard, Phone, Mail, MapPin
} from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle
} from '../../components/ui/alert-dialog';
import { formatCurrency } from '../../lib/utils';

export default function CaterersPage() {
  const [location, setLocation] = useLocation();
  const { data: caterers, isLoading } = useCaterers();
  const deleteCaterer = useDeleteCaterer();
  const [searchQuery, setSearchQuery] = useState('');
  const [catererToDelete, setCatererToDelete] = useState<Caterer | null>(null);

  // Helper function to navigate
  const navigate = (path: string) => setLocation(path);

  const filteredCaterers = caterers?.filter(caterer =>
    caterer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (caterer.contactName && caterer.contactName.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (caterer.email && caterer.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (caterer.phone && caterer.phone.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleDelete = () => {
    if (catererToDelete) {
      deleteCaterer.mutate(catererToDelete.id);
      setCatererToDelete(null);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center">
          <ChefHat className="h-6 w-6 mr-2 text-primary" />
          <h1 className="text-2xl font-bold">Caterers</h1>
        </div>
        <Button onClick={() => navigate('/caterers/new')} className="bg-primary">
          <Plus className="h-4 w-4 mr-2" />
          Add Caterer
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Caterer Management</CardTitle>
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search caterers..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredCaterers && filteredCaterers.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Balance Due</TableHead>
                    <TableHead>Total Orders</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCaterers.map((caterer) => (
                    <TableRow key={caterer.id}>
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span>{caterer.name}</span>
                          {caterer.contactName && (
                            <span className="text-sm text-muted-foreground">
                              Contact: {caterer.contactName}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col space-y-1">
                          {caterer.phone && (
                            <div className="flex items-center text-sm">
                              <Phone className="h-3 w-3 mr-1" />
                              <span>{caterer.phone}</span>
                            </div>
                          )}
                          {caterer.email && (
                            <div className="flex items-center text-sm">
                              <Mail className="h-3 w-3 mr-1" />
                              <span>{caterer.email}</span>
                            </div>
                          )}
                          {caterer.address && (
                            <div className="flex items-center text-sm">
                              <MapPin className="h-3 w-3 mr-1" />
                              <span className="truncate max-w-[200px]">{caterer.address}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={caterer.isActive ? "success" : "secondary"}>
                          {caterer.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {formatCurrency(Number(caterer.balanceDue || 0))}
                      </TableCell>
                      <TableCell>
                        {caterer.totalOrders || 0}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              // Force navigation with window.location to avoid potential routing issues
                              window.location.href = `/distributions/new?catererId=${caterer.id}`;
                            }}
                            title="Create Distribution"
                          >
                            <CreditCard className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              // Force navigation with window.location to avoid potential routing issues
                              window.location.href = `/caterers/${caterer.id}`;
                            }}
                            title="Edit Caterer"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => setCatererToDelete(caterer)}
                            title="Delete Caterer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-10">
              <p className="text-muted-foreground">No caterers found</p>
              {searchQuery && (
                <p className="text-sm text-muted-foreground mt-2">
                  Try adjusting your search query
                </p>
              )}
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => navigate('/caterers/new')}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Caterer
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!catererToDelete} onOpenChange={(open) => !open && setCatererToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the caterer "{catererToDelete?.name}".
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
