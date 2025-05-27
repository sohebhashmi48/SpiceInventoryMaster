import { Vendor } from "@shared/schema";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Edit, Trash2, Mail, Phone, MapPin, DollarSign, Star, Building } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface VendorCardProps {
  vendor: Vendor;
  onEdit: (vendor: Vendor) => void;
  onDelete: (id: number) => void;
}

export default function VendorCard({ vendor, onEdit, onDelete }: VendorCardProps) {
  const renderRating = (rating: number | null | undefined) => {
    if (!rating) return null;

    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating
                ? "text-yellow-500 fill-current"
                : "text-gray-300"
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <Card className="overflow-hidden transition-all duration-200 hover:shadow-md">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 pb-4">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg font-semibold">{vendor.name}</CardTitle>
            {vendor.contactName && (
              <CardDescription className="mt-1 flex items-center text-sm">
                <Building className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                {vendor.contactName}
              </CardDescription>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onEdit(vendor)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Vendor
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(vendor.id)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Vendor
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {renderRating(vendor.rating)}
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        <div className="space-y-2">
          {vendor.email && (
            <div className="flex items-center text-sm">
              <Mail className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
              <span>{vendor.email}</span>
            </div>
          )}

          {vendor.phone && (
            <div className="flex items-center text-sm">
              <Phone className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
              <span>{vendor.phone}</span>
            </div>
          )}

          {vendor.address && (
            <div className="flex items-start text-sm">
              <MapPin className="h-3.5 w-3.5 mr-2 mt-0.5 text-muted-foreground" />
              <span className="line-clamp-2">{vendor.address}</span>
            </div>
          )}
        </div>

        <div className="pt-2 border-t">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Payment Terms</span>
            <span className="text-sm">{vendor.paymentTerms || "N/A"}</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-muted/50 rounded-md p-2">
              <div className="text-xs text-muted-foreground mb-1">Balance Due</div>
              <div className="flex items-center">
                <span className="mr-1 text-red-500 font-bold">₹</span>
                <span className={cn(
                  "font-medium",
                  Number(vendor.balanceDue || 0) > 0 ? "text-red-500" : ""
                )}>
                  {Number(vendor.balanceDue || 0).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Credit Limit field removed */}
          </div>
        </div>
      </CardContent>

      <CardFooter className="bg-muted/30 px-4 py-2 flex justify-between">
        <Badge
          variant={vendor.isActive ? "default" : "outline"}
          className={vendor.isActive ? "bg-green-500/20 text-green-700 hover:bg-green-500/30" : ""}
        >
          {vendor.isActive ? "Active" : "Inactive"}
        </Badge>

        <div className="text-xs text-muted-foreground">
          {vendor.totalPaid && Number(vendor.totalPaid) > 0 ? (
            <span className="flex items-center">
              <DollarSign className="h-3 w-3 mr-1 text-green-500" />
              <span className="text-green-600">${Number(vendor.totalPaid).toFixed(2)} paid</span>
            </span>
          ) : null}
        </div>
      </CardFooter>
    </Card>
  );
}
