import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { 
  CheckCircle, 
  Clock, 
  Package, 
  Truck, 
  XCircle,
  AlertTriangle
} from 'lucide-react';

interface OrderConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  order: {
    id: number;
    order_number: string;
    customer_name: string;
    total_amount: number;
    status: string;
  };
  action: 'approve' | 'confirm' | 'process' | 'ship' | 'deliver' | 'cancel';
  isLoading?: boolean;
}

export default function OrderConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  order,
  action,
  isLoading = false
}: OrderConfirmationDialogProps) {
  
  const getActionDetails = (action: string) => {
    switch (action) {
      case 'approve':
        return {
          title: 'Approve Order',
          description: 'Are you sure you want to approve this order? This will confirm the order and notify the customer.',
          icon: <CheckCircle className="h-5 w-5 text-green-600" />,
          confirmText: 'Approve Order',
          confirmClass: 'bg-green-600 hover:bg-green-700'
        };
      case 'confirm':
        return {
          title: 'Confirm Order',
          description: 'Are you sure you want to confirm this order? This will move the order to confirmed status.',
          icon: <CheckCircle className="h-5 w-5 text-blue-600" />,
          confirmText: 'Confirm Order',
          confirmClass: 'bg-blue-600 hover:bg-blue-700'
        };
      case 'process':
        return {
          title: 'Start Processing',
          description: 'Are you sure you want to start processing this order? This will move the order to processing status.',
          icon: <Package className="h-5 w-5 text-purple-600" />,
          confirmText: 'Start Processing',
          confirmClass: 'bg-purple-600 hover:bg-purple-700'
        };
      case 'ship':
        return {
          title: 'Ship Order',
          description: 'Are you sure you want to mark this order as shipped? This will move the order to out for delivery status.',
          icon: <Truck className="h-5 w-5 text-orange-600" />,
          confirmText: 'Ship Order',
          confirmClass: 'bg-orange-600 hover:bg-orange-700'
        };
      case 'deliver':
        return {
          title: 'Mark as Delivered',
          description: 'Are you sure you want to mark this order as delivered? This action will complete the order.',
          icon: <CheckCircle className="h-5 w-5 text-green-600" />,
          confirmText: 'Mark Delivered',
          confirmClass: 'bg-green-600 hover:bg-green-700'
        };
      case 'cancel':
        return {
          title: 'Cancel Order',
          description: 'Are you sure you want to cancel this order? This action cannot be undone.',
          icon: <XCircle className="h-5 w-5 text-red-600" />,
          confirmText: 'Cancel Order',
          confirmClass: 'bg-red-600 hover:bg-red-700'
        };
      default:
        return {
          title: 'Confirm Action',
          description: 'Are you sure you want to perform this action?',
          icon: <AlertTriangle className="h-5 w-5 text-yellow-600" />,
          confirmText: 'Confirm',
          confirmClass: 'bg-primary hover:bg-primary/90'
        };
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'confirmed': return <CheckCircle className="h-4 w-4" />;
      case 'processing': return <Package className="h-4 w-4" />;
      case 'out_for_delivery': return <Truck className="h-4 w-4" />;
      case 'delivered': return <CheckCircle className="h-4 w-4" />;
      case 'cancelled': return <XCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'processing': return 'bg-purple-100 text-purple-800';
      case 'out_for_delivery': return 'bg-orange-100 text-orange-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const actionDetails = getActionDetails(action);

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {actionDetails.icon}
            {actionDetails.title}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4">
            <p>{actionDetails.description}</p>
            
            {/* Order Details Card */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Order Number:</span>
                <span className="font-mono text-sm font-bold">{order.order_number}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Customer:</span>
                <span className="text-sm font-medium">{order.customer_name}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Total Amount:</span>
                <span className="text-sm font-bold text-primary">{formatCurrency(order.total_amount)}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Current Status:</span>
                <Badge className={`${getStatusColor(order.status)} flex items-center gap-1`}>
                  {getStatusIcon(order.status)}
                  {order.status.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>
            </div>

            {action === 'cancel' && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium text-red-800">Warning</span>
                </div>
                <p className="text-sm text-red-700 mt-1">
                  This action cannot be undone. The order will be permanently cancelled.
                </p>
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className={actionDetails.confirmClass}
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Processing...
              </div>
            ) : (
              actionDetails.confirmText
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
