import { useLocation } from 'wouter';
import { Caterer, useCatererBalance } from '@/hooks/use-caterers';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ChefHat,
  Mail,
  Phone,
  MapPin,
  Edit,
  Trash2,
  Eye,
  CreditCard,
  DollarSign
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { getCatererImageUrl } from '@/lib/image-utils';
import { memo } from 'react';

interface CatererCardProps {
  caterer: Caterer;
  onEdit: (caterer: Caterer) => void;
  onDelete: (caterer: Caterer) => Promise<void>;
  onView?: (caterer: Caterer) => void;
}

const CatererCard = memo(({ caterer, onEdit, onDelete, onView }: CatererCardProps) => {
  const [, navigate] = useLocation();

  // Fetch real-time balance data
  const { data: balanceData, isLoading, error } = useCatererBalance(caterer.id, {
    refetchInterval: 5000, // Refetch every 5 seconds for more responsive updates
  });

  // Use the latest balance data or fall back to the caterer prop (with proper type conversion)
  const currentBalance = balanceData?.balanceDue ?? (Number(caterer.balanceDue) || 0);
  const currentTotalBilled = balanceData?.totalBilled ?? (Number(caterer.totalBilled) || 0);
  const currentTotalOrders = balanceData?.totalOrders ?? (Number(caterer.totalOrders) || 0);

  return (
    <Card className="overflow-hidden h-full flex flex-col">
      {/* Shop Card Image */}
      {caterer.shopCardImage && (
        <div className="h-32 overflow-hidden">
          <img
            src={getCatererImageUrl(caterer.shopCardImage) || ''}
            alt={`${caterer.name} shop card`}
            className="w-full h-full object-cover"
            onError={(e) => {
              console.error('Failed to load caterer shop card:', caterer.shopCardImage);
              console.error('Attempted URL:', getCatererImageUrl(caterer.shopCardImage));
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
      )}

      <CardContent className="p-0 flex-grow">
        <div className="p-5">
          <div className="flex justify-between items-start mb-3">
            <h3 className="font-semibold text-xl line-clamp-1">{caterer.name}</h3>
            <Badge
              variant={caterer.isActive ? "default" : "secondary"}
              className="ml-2 shrink-0"
            >
              {caterer.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>

          {caterer.contactName && (
            <p className="text-sm text-muted-foreground mb-3">{caterer.contactName}</p>
          )}

          <div className="mt-4 space-y-2">
            {caterer.email && (
              <div className="flex items-center text-sm">
                <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="truncate">{caterer.email}</span>
              </div>
            )}
            {caterer.phone && (
              <div className="flex items-center text-sm">
                <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                <span>{caterer.phone}</span>
              </div>
            )}
            {caterer.address && (
              <div className="flex items-start text-sm">
                <MapPin className="h-4 w-4 mr-2 text-muted-foreground mt-0.5" />
                <span className="line-clamp-1">{caterer.address}</span>
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs text-muted-foreground">Balance Due</p>
                <p className={`font-medium ${Number(currentBalance) > 0 ? 'text-red-600' : ''}`}>
                  {formatCurrency(Number(currentBalance))}
                </p>
              </div>
              {/* Credit Limit field removed */}
              <div>
                <p className="text-xs text-muted-foreground">Total Billed</p>
                <p className="font-medium">
                  {formatCurrency(Number(currentTotalBilled))}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Orders</p>
                <p className="font-medium">{currentTotalOrders}</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex flex-wrap gap-1 p-3 pt-0 border-t">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(caterer)}
          className="flex-1 h-9 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-1"
        >
          <Edit className="h-3 w-3 mr-1" />
          Edit
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={async () => {
            if (caterer) {
              console.log(`Deleting caterer: ${caterer.name}`);
              try {
                await onDelete(caterer);
              } catch (error) {
                console.error('Error in delete handler:', error);
              }
            } else {
              console.error('Cannot delete caterer: Invalid caterer object', caterer);
            }
          }}
          className="flex-1 h-9 text-xs text-red-600 hover:text-red-800 hover:bg-red-50 px-1"
        >
          <Trash2 className="h-3 w-3 mr-1" />
          Delete
        </Button>
        {onView && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onView(caterer)}
            className="flex-1 h-9 text-xs text-purple-600 hover:text-purple-800 hover:bg-purple-50 px-1"
          >
            <ChefHat className="h-3 w-3 mr-1" />
            View Card
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/caterers/${caterer.id}`)}
          className="flex-1 h-9 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-1"
        >
          <Eye className="h-3 w-3 mr-1" />
          Details
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/caterer-billing?catererId=${caterer.id}`)}
          className="flex-1 h-9 text-xs text-green-600 hover:text-green-800 hover:bg-green-50 px-1"
        >
          <CreditCard className="h-3 w-3 mr-1" />
          Bill
        </Button>
      </CardFooter>
    </Card>
  );
});

export default CatererCard;
