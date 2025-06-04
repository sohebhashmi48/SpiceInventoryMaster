import { useState } from "react";
import { Vendor } from "@shared/schema";
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
  Star,
  DollarSign,
  Calendar,
  Tag,
  Building2,
  User,
  Edit,
  X
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { getSupplierImageUrl } from "@/lib/image-utils";

interface SupplierCardModalProps {
  supplier: Vendor | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (supplier: Vendor) => void;
}

export default function SupplierCardModal({
  supplier,
  isOpen,
  onClose,
  onEdit
}: SupplierCardModalProps) {
  if (!supplier) return null;

  const handleEdit = () => {
    if (onEdit) {
      onEdit(supplier);
    }
    onClose();
  };



  const renderStars = (rating: number | null | undefined) => {
    if (!rating) return null;

    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating
                ? "fill-yellow-400 text-yellow-400"
                : "text-gray-300"
            }`}
          />
        ))}
        <span className="text-sm text-muted-foreground ml-1">({rating}/5)</span>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Supplier Card</span>
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
            Complete supplier information and details
          </DialogDescription>
        </DialogHeader>

        <Card className="border-0 shadow-none">
          <CardContent className="p-0">
            {/* Supplier Image */}
            {supplier.supplierImage && (
              <div className="mb-6">
                <img
                  src={getSupplierImageUrl(supplier.supplierImage) || ''}
                  alt={`${supplier.name} image`}
                  className="w-full h-48 object-cover rounded-lg border"
                  onError={(e) => {
                    console.error('Failed to load supplier image:', supplier.supplierImage);
                    console.error('Attempted URL:', getSupplierImageUrl(supplier.supplierImage));
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            )}

            {/* Header Section */}
            <div className="mb-6">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900">{supplier.name}</h2>
                  {supplier.contactName && (
                    <div className="flex items-center text-muted-foreground mt-1">
                      <User className="h-4 w-4 mr-2" />
                      <span>{supplier.contactName}</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2 ml-4">
                  <Badge
                    variant={supplier.isActive ? "default" : "secondary"}
                    className="text-sm"
                  >
                    {supplier.isActive ? "Active" : "Inactive"}
                  </Badge>
                  {supplier.rating && renderStars(supplier.rating)}
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="font-semibold text-lg mb-3 flex items-center">
                  <Building2 className="h-5 w-5 mr-2" />
                  Contact Information
                </h3>
                <div className="space-y-3">
                  {supplier.email && (
                    <div className="flex items-center">
                      <Mail className="h-4 w-4 mr-3 text-muted-foreground" />
                      <span className="text-sm">{supplier.email}</span>
                    </div>
                  )}
                  {supplier.phone && (
                    <div className="flex items-center">
                      <Phone className="h-4 w-4 mr-3 text-muted-foreground" />
                      <span className="text-sm">{supplier.phone}</span>
                    </div>
                  )}
                  {supplier.address && (
                    <div className="flex items-start">
                      <MapPin className="h-4 w-4 mr-3 text-muted-foreground mt-0.5" />
                      <span className="text-sm">{supplier.address}</span>
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
                    <span className="text-sm text-muted-foreground">Credit Limit:</span>
                    <span className="text-sm font-medium">
                      {formatCurrency(Number(supplier.creditLimit) || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-sm text-muted-foreground">Balance Due:</span>
                    <span className={`text-sm font-medium ${
                      Number(supplier.balanceDue) > 0 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {formatCurrency(Number(supplier.balanceDue) || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-sm text-muted-foreground">Total Paid:</span>
                    <span className="text-sm font-medium">
                      {formatCurrency(Number(supplier.totalPaid) || 0)}
                    </span>
                  </div>
                  {supplier.paymentTerms && (
                    <div className="flex justify-between items-center py-1">
                      <span className="text-sm text-muted-foreground">Payment Terms:</span>
                      <span className="text-sm font-medium text-right max-w-[120px] truncate">
                        {supplier.paymentTerms}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Tags */}
            {supplier.tags && supplier.tags.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold text-lg mb-3 flex items-center">
                  <Tag className="h-5 w-5 mr-2" />
                  Tags
                </h3>
                <div className="flex flex-wrap gap-2">
                  {supplier.tags.map((tag, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {supplier.notes && (
              <div className="mb-6">
                <h3 className="font-semibold text-lg mb-3">Notes</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {supplier.notes}
                  </p>
                </div>
              </div>
            )}

            {/* Timestamps */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                {supplier.createdAt && (
                  <div className="flex items-center">
                    <Calendar className="h-3 w-3 mr-1" />
                    Created: {new Date(supplier.createdAt).toLocaleDateString()}
                  </div>
                )}
                {supplier.updatedAt && (
                  <div className="flex items-center">
                    <Calendar className="h-3 w-3 mr-1" />
                    Updated: {new Date(supplier.updatedAt).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
