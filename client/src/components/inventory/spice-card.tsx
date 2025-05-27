import { useState, useEffect } from "react";
import { Spice, Category } from "@shared/schema";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, Edit, Eye, MoreHorizontal, Trash2, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatQuantityWithUnit, UnitType } from "@/lib/utils";

interface SpiceCardProps {
  spice: Spice;
  categories?: Category[];
  onView: (spice: Spice) => void;
  onEdit: (spice: Spice) => void;
  onDelete: (spice: Spice) => void;
}

export default function SpiceCard({ spice, categories, onView, onEdit, onDelete }: SpiceCardProps) {
  // We'll use the market price directly from the spice object

  const getCategoryName = (categoryId: number) => {
    return categories?.find(c => c.id === categoryId)?.name || "Unknown";
  };

  return (
    <Card className="overflow-hidden h-30 flex flex-col">
      <div className="relative h-48 bg-gray-100">
        {spice.imagePath ? (
          <img
            src={`/api${spice.imagePath}`}
            alt={spice.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-secondary/10 text-secondary text-4xl font-bold">
            {spice.name.substring(0, 2).toUpperCase()}
          </div>
        )}
        <div className="absolute top-2 right-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="bg-white/80 hover:bg-white">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onView(spice)}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(spice)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Product
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(spice)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Product
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="absolute bottom-2 left-2">
          {spice.isActive ? (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              <Check className="mr-1 h-3 w-3" /> Active
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
              <X className="mr-1 h-3 w-3" /> Inactive
            </Badge>
          )}
        </div>
      </div>
      <CardHeader className="pb-2">
        <div className="font-bold text-lg line-clamp-1">{spice.name}</div>
        <div className="text-sm text-muted-foreground">
          {getCategoryName(spice.categoryId)}
        </div>
      </CardHeader>
      <CardContent className="pb-2 flex-grow">
        <div className="text-sm line-clamp-2 text-muted-foreground mb-2">
          {spice.description || "No description"}
        </div>
        <div className="text-sm">
          <span className="text-muted-foreground">Origin:</span> {spice.origin || "Unknown"}
        </div>
      </CardContent>
      <CardFooter className="border-t pt-3 flex justify-between">
        <div className="font-medium">
          <div className="text-xs text-muted-foreground mb-1">Market Price:</div>
          <span className="text-blue-600">₹{Number(spice.marketPrice).toFixed(2)}/{spice.unit}</span>
        </div>
        <div className="text-sm text-muted-foreground">
          {spice.stocksQty <= 10 ? (
            <span className="text-red-600">
              {formatQuantityWithUnit(spice.stocksQty, spice.unit as UnitType, true)} in stock
            </span>
          ) : (
            <span>
              {formatQuantityWithUnit(spice.stocksQty, spice.unit as UnitType, true)} in stock
            </span>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}

