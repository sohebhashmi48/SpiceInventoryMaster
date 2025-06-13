import React, { useState } from 'react';
import { Plus, Trash2, Save, User, Phone, CreditCard, ShoppingCart, Receipt, Package } from 'lucide-react';

export default function CustomerBillingPage() {
  // Mock data for demonstration
  const products = [
    { id: 1, name: 'Premium Coffee Beans', retailPrice: 25.99 },
    { id: 2, name: 'Organic Tea Leaves', retailPrice: 18.50 },
    { id: 3, name: 'Artisan Chocolate', retailPrice: 12.75 },
    { id: 4, name: 'Fresh Pastries', retailPrice: 8.99 },
    { id: 5, name: 'Energy Drink', retailPrice: 4.50 }
  ];

  const [formData, setFormData] = useState({
    clientName: '',
    clientMobile: '',
    paymentMethod: 'Cash'
  });
  
  const [cart, setCart] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    if (!formData.clientName.trim()) newErrors.clientName = 'Client name is required';
    if (!formData.clientMobile.trim() || formData.clientMobile.length < 10) {
      newErrors.clientMobile = 'Valid mobile number required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const addToCart = () => {
    if (!selectedProduct) return;
    
    const product = products.find(p => p.id.toString() === selectedProduct);
    if (!product) return;

    const total = quantity * product.retailPrice;
    const cartItem = {
      ...product,
      quantity,
      total,
      cartId: Date.now() // Simple unique ID for cart items
    };

    setCart(prev => [...prev, cartItem]);
    setSelectedProduct('');
    setQuantity(1);
  };

  const removeFromCart = (cartId) => {
    setCart(prev => prev.filter(item => item.cartId !== cartId));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    if (cart.length === 0) {
      alert('Please add items to cart');
      return;
    }
    
    console.log('Bill submitted:', {
      ...formData,
      items: cart,
      total: cart.reduce((sum, item) => sum + item.total, 0)
    });
    alert('Bill created successfully!');
  };

  const total = cart.reduce((sum, item) => sum + item.total, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Receipt className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Customer Billing</h1>
                <p className="text-gray-600">Create and manage customer invoices</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          
          {/* Customer Details Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <User className="w-5 h-5 text-green-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Customer Details</h2>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Customer Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={formData.clientName}
                      onChange={(e) => setFormData(prev => ({ ...prev, clientName: e.target.value }))}
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                      placeholder="Enter customer name"
                    />
                  </div>
                  {errors.clientName && (
                    <p className="text-sm text-red-600">{errors.clientName}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Mobile Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="tel"
                      value={formData.clientMobile}
                      onChange={(e) => setFormData(prev => ({ ...prev, clientMobile: e.target.value }))}
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                      placeholder="Enter mobile number"
                    />
                  </div>
                  {errors.clientMobile && (
                    <p className="text-sm text-red-600">{errors.clientMobile}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Payment Method
                  </label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <select
                      value={formData.paymentMethod}
                      onChange={(e) => setFormData(prev => ({ ...prev, paymentMethod: e.target.value }))}
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors appearance-none bg-white"
                    >
                      <option value="Cash">Cash</option>
                      <option value="Card">Card</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="UPI">UPI</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Add Products Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Package className="w-5 h-5 text-purple-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Add Products</h2>
              </div>
            </div>
            <div className="p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Select Product
                  </label>
                  <select
                    value={selectedProduct}
                    onChange={(e) => setSelectedProduct(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  >
                    <option value="">Choose a product...</option>
                    {products.map(product => (
                      <option key={product.id} value={product.id.toString()}>
                        {product.name} - ${product.retailPrice}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="w-full sm:w-32 space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={addToCart}
                    disabled={!selectedProduct}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add to Cart</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Cart and Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Cart Items */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-100">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <ShoppingCart className="w-5 h-5 text-orange-600" />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      Cart Items ({cart.length})
                    </h2>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  {cart.length === 0 ? (
                    <div className="p-12 text-center">
                      <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">No items in cart</p>
                      <p className="text-sm text-gray-400">Add products to get started</p>
                    </div>
                  ) : (
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Product
                          </th>
                          <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Qty
                          </th>
                          <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Price
                          </th>
                          <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Total
                          </th>
                          <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {cart.map((item) => (
                          <tr key={item.cartId} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="font-medium text-gray-900">{item.name}</div>
                            </td>
                            <td className="px-6 py-4 text-right text-gray-700">
                              {item.quantity}
                            </td>
                            <td className="px-6 py-4 text-right text-gray-700">
                              ${item.retailPrice.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 text-right font-medium text-gray-900">
                              ${item.total.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button
                                type="button"
                                onClick={() => removeFromCart(item.cartId)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl border border-blue-100 overflow-hidden">
                <div className="px-6 py-5 border-b border-blue-200">
                  <h3 className="text-lg font-semibold text-gray-900">Order Summary</h3>
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex justify-between text-gray-600">
                    <span>Total Items:</span>
                    <span className="font-medium">{cart.length}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal:</span>
                    <span className="font-medium">${total.toFixed(2)}</span>
                  </div>
                  <hr className="border-blue-200" />
                  <div className="flex justify-between text-xl font-bold text-gray-900">
                    <span>Total:</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={cart.length === 0}
                className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-2 text-lg font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <Save className="w-5 h-5" />
                <span>Create Bill</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}