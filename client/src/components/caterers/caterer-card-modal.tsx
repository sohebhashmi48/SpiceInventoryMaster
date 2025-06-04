import { useState } from "react";
import { Caterer } from "@/hooks/use-caterers";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Mail,
  Phone,
  MapPin,
  DollarSign,
  Calendar,
  Building2,
  User,
  Edit,
  ChefHat,
  CreditCard,
  Receipt
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { getCatererImageUrl } from "@/lib/image-utils";

interface CatererCardModalProps {
  caterer: Caterer | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (caterer: Caterer) => void;
}

export default function CatererCardModal({
  caterer,
  isOpen,
  onClose,
  onEdit
}: CatererCardModalProps) {
  if (!caterer) return null;

  const handleEdit = () => {
    if (onEdit) {
      onEdit(caterer);
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Caterer Card</span>
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleEdit}
                className="flex items-center gap-2"
              >
                <Edit className="h-4 w-4" />
                Edit
              </Button>
            )}
          </DialogTitle>
          <DialogDescription>
            Complete caterer information and details
          </DialogDescription>
        </DialogHeader>

        <Card className="border-0 shadow-none">
          <CardContent className="p-0">
            {/* Shop Card Image */}
            {caterer.shopCardImage && (
              <div className="mb-6">
                <img
                  src={getCatererImageUrl(caterer.shopCardImage) || ''}
                  alt={`${caterer.name} shop card`}
                  className="w-full h-48 object-cover rounded-lg border"
                  onError={(e) => {
                    console.error('Failed to load caterer shop card:', caterer.shopCardImage);
                    console.error('Attempted URL:', getCatererImageUrl(caterer.shopCardImage));
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            )}

            {/* Header Section */}
            <div className="mb-6">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900">{caterer.name}</h2>
                  {caterer.contactName && (
                    <div className="flex items-center text-muted-foreground mt-1">
                      <User className="h-4 w-4 mr-2" />
                      <span>{caterer.contactName}</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2 ml-4">
                  <Badge
                    variant={caterer.isActive ? "default" : "secondary"}
                    className="text-sm"
                  >
                    {caterer.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="font-semibold text-lg mb-3 flex items-center">
                  <Phone className="h-5 w-5 mr-2" />
                  Contact Information
                </h3>
                <div className="space-y-3">
                  {caterer.phone && (
                    <div className="flex items-center py-1">
                      <Phone className="h-4 w-4 mr-3 text-muted-foreground" />
                      <span className="text-sm">{caterer.phone}</span>
                    </div>
                  )}
                  {caterer.email && (
                    <div className="flex items-center py-1">
                      <Mail className="h-4 w-4 mr-3 text-muted-foreground" />
                      <span className="text-sm">{caterer.email}</span>
                    </div>
                  )}
                  {caterer.address && (
                    <div className="flex items-start py-1">
                      <MapPin className="h-4 w-4 mr-3 text-muted-foreground mt-0.5" />
                      <div className="text-sm">
                        <div>{caterer.address}</div>
                        {(caterer.city || caterer.state || caterer.pincode) && (
                          <div className="text-muted-foreground">
                            {caterer.city && `${caterer.city}, `}
                            {caterer.state && `${caterer.state} `}
                            {caterer.pincode && caterer.pincode}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Financial Information */}
              <div>
                <h3 className="font-semibold text-lg mb-3 flex items-center">
                  <DollarSign className="h-5 w-5 mr-2" />
                  Financial Details
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-1">
                    <span className="text-sm text-muted-foreground">Total Billed:</span>
                    <span className="text-sm font-medium">
                      {formatCurrency(Number(caterer.totalBilled) || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-sm text-muted-foreground">Total Paid:</span>
                    <span className="text-sm font-medium">
                      {formatCurrency(Number(caterer.totalPaid) || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-sm text-muted-foreground">Balance Due:</span>
                    <span className={`text-sm font-medium ${
                      Number(caterer.balanceDue) > 0 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {formatCurrency(Number(caterer.balanceDue) || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-sm text-muted-foreground">Total Orders:</span>
                    <span className="text-sm font-medium">
                      {caterer.totalOrders || 0}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Business Information */}
            {caterer.gstNumber && (
              <div className="mb-6">
                <h3 className="font-semibold text-lg mb-3 flex items-center">
                  <Building2 className="h-5 w-5 mr-2" />
                  Business Information
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-1">
                    <span className="text-sm text-muted-foreground">GST Number:</span>
                    <span className="text-sm font-medium">{caterer.gstNumber}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Notes */}
            {caterer.notes && (
              <div className="mb-6">
                <h3 className="font-semibold text-lg mb-3">Notes</h3>
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-sm whitespace-pre-line">{caterer.notes}</p>
                </div>
              </div>
            )}

            {/* Timestamps */}
            <div className="flex justify-between text-xs text-muted-foreground pt-4 border-t">
              <span>Created: {new Date(caterer.createdAt).toLocaleDateString()}</span>
              <span>Updated: {new Date(caterer.updatedAt).toLocaleDateString()}</span>
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
