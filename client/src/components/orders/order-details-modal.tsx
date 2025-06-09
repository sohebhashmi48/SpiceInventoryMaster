import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Printer,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Package,
  User,
  MessageSquare,
  CheckCircle,
  Clock,
  Truck,
  XCircle,
  X
} from 'lucide-react';
import { formatCurrency, formatDate, formatQuantity } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { useOrderDetails, useOrderMutations, getStatusColor } from '@/hooks/use-orders';

// Utility function to get correct image URL
const getImageUrl = (imagePath: string | null | undefined): string | null => {
  if (!imagePath) return null;

  // If it already starts with /api/, return as is
  if (imagePath.startsWith('/api/')) {
    return imagePath;
  }

  // If it's just a filename, construct the full path
  if (!imagePath.includes('/')) {
    return `/api/uploads/spices/${imagePath}`;
  }

  // If it's a relative path, extract filename and construct full path
  const filename = imagePath.split('/').pop();
  return `/api/uploads/spices/${filename}`;
};

interface OrderItem {
  id: number;
  product_id?: number;
  product_name: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_price: number;
  product_image?: string;
}

interface OrderDetails {
  id: number;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  delivery_address: string;
  subtotal: number;
  delivery_fee: number;
  total_amount: number;
  status: string;
  order_source: string;
  notes?: string;
  whatsapp_message?: string;
  created_at: string;
  approved_at?: string;
  approved_by_name?: string;
  items: OrderItem[];
}

interface OrderDetailsModalProps {
  order: any;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export default function OrderDetailsModal({ order, isOpen, onClose, onRefresh }: OrderDetailsModalProps) {
  const [newStatus, setNewStatus] = useState(order.status);

  // Fetch detailed order information
  const { data: orderDetails, isLoading } = useOrderDetails(order.id);
  const { updateOrderStatus } = useOrderMutations();

  const handleStatusUpdate = async () => {
    if (newStatus !== order.status) {
      try {
        await updateOrderStatus.mutateAsync({
          orderId: order.id,
          status: newStatus
        });
        toast({
          title: 'Status Updated',
          description: 'Order status has been updated successfully.',
        });
        onRefresh();
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to update order status.',
          variant: 'destructive',
        });
      }
    }
  };

  const handlePrint = () => {
    if (!orderDetails) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Order #${orderDetails.order_number}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: Arial, sans-serif; 
              line-height: 1.4; 
              color: #333;
              background: white;
            }
            .container { max-width: 800px; margin: 0 auto; padding: 20px; }
            .header { 
              text-align: center; 
              margin-bottom: 30px; 
              padding: 20px;
              background: linear-gradient(135deg, #8B4513 0%, #D2691E 100%);
              color: white;
              border-radius: 10px;
            }
            .company-name { 
              font-size: 28px; 
              font-weight: bold; 
              margin-bottom: 5px;
            }
            .company-tagline { 
              font-size: 14px; 
              opacity: 0.9;
            }
            .order-info { 
              display: grid; 
              grid-template-columns: 1fr 1fr; 
              gap: 20px; 
              margin-bottom: 30px;
            }
            .info-section { 
              background: #f8f9fa; 
              padding: 15px; 
              border-radius: 8px;
              border-left: 4px solid #8B4513;
            }
            .info-title { 
              font-weight: bold; 
              color: #8B4513; 
              margin-bottom: 10px;
              font-size: 16px;
            }
            .info-item { 
              margin-bottom: 5px; 
              font-size: 14px;
            }
            .products-table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-bottom: 30px;
              background: white;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .products-table th { 
              background: #8B4513; 
              color: white; 
              padding: 12px; 
              text-align: left;
              font-weight: bold;
            }
            .products-table td { 
              padding: 12px; 
              border-bottom: 1px solid #eee;
            }
            .products-table tr:nth-child(even) { 
              background: #f8f9fa;
            }
            .totals { 
              background: #f8f9fa; 
              padding: 20px; 
              border-radius: 8px;
              border: 2px solid #8B4513;
            }
            .total-row { 
              display: flex; 
              justify-content: space-between; 
              margin-bottom: 8px;
              font-size: 14px;
            }
            .total-row.final { 
              font-weight: bold; 
              font-size: 18px; 
              color: #8B4513;
              border-top: 2px solid #8B4513;
              padding-top: 10px;
              margin-top: 10px;
            }
            .footer { 
              text-align: center; 
              margin-top: 30px; 
              padding: 20px;
              background: #8B4513;
              color: white;
              border-radius: 8px;
            }
            .status-badge {
              display: inline-block;
              padding: 4px 12px;
              border-radius: 20px;
              font-size: 12px;
              font-weight: bold;
              text-transform: uppercase;
            }
            .status-pending { background: #fef3c7; color: #92400e; }
            .status-confirmed { background: #dbeafe; color: #1e40af; }
            .status-processing { background: #e9d5ff; color: #7c3aed; }
            .status-delivered { background: #d1fae5; color: #065f46; }
            @media print {
              body { margin: 0; }
              .container { padding: 10px; }
              .header { margin-bottom: 20px; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <!-- Header -->
            <div class="header">
              <div class="company-name">🌶️ RoyalSpicyMasala</div>
              <div class="company-tagline">Premium Spices & Masalas</div>
            </div>

            <!-- Order Information -->
            <div class="order-info">
              <div class="info-section">
                <div class="info-title">📋 Order Details</div>
                <div class="info-item"><strong>Order Number:</strong> ${orderDetails.order_number}</div>
                <div class="info-item"><strong>Date:</strong> ${formatDate(orderDetails.created_at)}</div>
                <div class="info-item"><strong>Status:</strong> 
                  <span class="status-badge status-${orderDetails.status}">${orderDetails.status.replace('_', ' ')}</span>
                </div>
                <div class="info-item"><strong>Source:</strong> ${orderDetails.order_source}</div>
              </div>

              <div class="info-section">
                <div class="info-title">👤 Customer Information</div>
                <div class="info-item"><strong>Name:</strong> ${orderDetails.customer_name}</div>
                <div class="info-item"><strong>Phone:</strong> ${orderDetails.customer_phone}</div>
                ${orderDetails.customer_email ? `<div class="info-item"><strong>Email:</strong> ${orderDetails.customer_email}</div>` : ''}
                <div class="info-item"><strong>Address:</strong> ${orderDetails.delivery_address}</div>
              </div>
            </div>

            <!-- Products Table -->
            <table class="products-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Quantity</th>
                  <th>Unit Price</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${orderDetails.items.map(item => `
                  <tr>
                    <td>${item.product_name}</td>
                    <td>${formatQuantity(item.quantity)} ${item.unit}</td>
                    <td>${formatCurrency(item.unit_price)}</td>
                    <td>${formatCurrency(item.total_price)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <!-- Totals -->
            <div class="totals">
              <div class="total-row">
                <span>Subtotal:</span>
                <span>${formatCurrency(orderDetails.subtotal)}</span>
              </div>
              <div class="total-row">
                <span>Delivery Fee:</span>
                <span>${formatCurrency(orderDetails.delivery_fee)}</span>
              </div>
              <div class="total-row final">
                <span>Total Amount:</span>
                <span>${formatCurrency(orderDetails.total_amount)}</span>
              </div>
            </div>

            ${orderDetails.notes ? `
              <div class="info-section" style="margin-top: 20px;">
                <div class="info-title">📝 Notes</div>
                <div class="info-item">${orderDetails.notes}</div>
              </div>
            ` : ''}

            <!-- Footer -->
            <div class="footer">
              <div style="margin-bottom: 10px;">Thank you for choosing RoyalSpicyMasala!</div>
              <div style="font-size: 12px; opacity: 0.9;">
                For any queries, please contact us at your convenience.
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
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



  if (!orderDetails && !isLoading) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Order Details - #{order.order_number}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <div className="animate-pulse bg-gray-200 rounded-lg h-32"></div>
            <div className="animate-pulse bg-gray-200 rounded-lg h-48"></div>
          </div>
        ) : orderDetails ? (
          <div className="space-y-6">
            {/* Header Actions */}
            <div className="flex justify-between items-center">
              <Badge className={`${getStatusColor(orderDetails.status)} flex items-center gap-1`}>
                {getStatusIcon(orderDetails.status)}
                {orderDetails.status.replace('_', ' ').toUpperCase()}
              </Badge>
              
              <div className="flex gap-2">
                <Button onClick={handlePrint} variant="outline">
                  <Printer className="h-4 w-4 mr-2" />
                  Print Receipt
                </Button>
              </div>
            </div>

            {/* Order Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Customer Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-500" />
                    <span>{orderDetails.customer_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <span>{orderDetails.customer_phone}</span>
                  </div>
                  {orderDetails.customer_email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-500" />
                      <span>{orderDetails.customer_email}</span>
                    </div>
                  )}
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-gray-500 mt-1" />
                    <span className="text-sm">{orderDetails.delivery_address}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Order Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <span className="text-sm text-gray-500">Order Date:</span>
                    <p className="font-medium">{formatDate(orderDetails.created_at)}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Source:</span>
                    <p className="font-medium capitalize">{orderDetails.order_source}</p>
                  </div>
                  {orderDetails.approved_at && (
                    <div>
                      <span className="text-sm text-gray-500">Approved:</span>
                      <p className="font-medium">{formatDate(orderDetails.approved_at)}</p>
                      {orderDetails.approved_by && (
                        <p className="text-sm text-gray-500">by {orderDetails.approved_by}</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Status Update */}
            <Card>
              <CardHeader>
                <CardTitle>Update Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 items-center">
                  <Select value={newStatus} onValueChange={setNewStatus}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Button
                    onClick={handleStatusUpdate}
                    disabled={newStatus === orderDetails.status || updateOrderStatus.isPending}
                  >
                    {updateOrderStatus.isPending ? 'Updating...' : 'Update Status'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Order Items */}
            <Card>
              <CardHeader>
                <CardTitle>Order Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {orderDetails.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-amber-100 rounded-lg flex items-center justify-center overflow-hidden">
                          {getImageUrl(item.product_image) ? (
                            <img
                              src={getImageUrl(item.product_image)!}
                              alt={item.product_name}
                              className="w-full h-full object-cover rounded-lg"
                              onError={(e) => {
                                // Fallback to spice emoji if image fails to load
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                target.parentElement!.innerHTML = '<span class="text-lg">🌶️</span>';
                              }}
                            />
                          ) : (
                            <span className="text-lg">🌶️</span>
                          )}
                        </div>
                        <div>
                          <h4 className="font-medium">{item.product_name}</h4>
                          <p className="text-sm text-gray-500">
                            {formatQuantity(item.quantity)} {item.unit} × {formatCurrency(item.unit_price)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-primary">{formatCurrency(item.total_price)}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <Separator className="my-4" />

                {/* Totals */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(orderDetails.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivery Fee:</span>
                    <span>{formatCurrency(orderDetails.delivery_fee)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total:</span>
                    <span className="text-primary">{formatCurrency(orderDetails.total_amount)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            {orderDetails.notes && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Notes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{orderDetails.notes}</p>
                </CardContent>
              </Card>
            )}

            {/* WhatsApp Message */}
            {orderDetails.whatsapp_message && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    WhatsApp Message
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="text-sm whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">
                    {orderDetails.whatsapp_message}
                  </pre>
                </CardContent>
              </Card>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
