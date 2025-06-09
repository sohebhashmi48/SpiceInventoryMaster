import React, { useState } from 'react';
import { ShoppingCart, Menu, X, Phone, Mail, MapPin, Search, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useLocation } from 'wouter';

interface ShowcaseLayoutProps {
  children: React.ReactNode;
  cartItemCount?: number;
  onSearchChange?: (query: string) => void;
  searchQuery?: string;
  onCartClick?: () => void;
  onMixCalculatorClick?: () => void;
}

export default function ShowcaseLayout({
  children,
  cartItemCount = 0,
  onSearchChange,
  searchQuery = '',
  onCartClick,
  onMixCalculatorClick
}: ShowcaseLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [, setLocation] = useLocation();

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleNavigation = (path: string) => {
    setLocation(path);
    setIsMobileMenuOpen(false);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onSearchChange) {
      onSearchChange(e.target.value);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50">
      {/* Header */}
      <header className="bg-white shadow-lg sticky top-0 z-50">
        <div className="container mx-auto px-4">
          {/* Top Bar with Contact Info - Mobile Responsive */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-2 text-xs sm:text-sm border-b border-gray-200 gap-2">
            <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-gray-600">
              <div className="flex items-center">
                <Phone className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 text-primary" />
                <span className="hidden sm:inline">+91 97027 13157</span>
                <span className="sm:hidden">Call</span>
              </div>
              <div className="flex items-center">
                <Mail className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 text-primary" />
                <span className="hidden sm:inline">orders@royalspicymasala.com</span>
                <span className="sm:hidden">Email</span>
              </div>
              <div className="flex items-center">
                <MapPin className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 text-primary" />
                <span>Mumbai, Maharashtra</span>
              </div>
            </div>
            <div className="text-primary font-medium text-xs sm:text-sm">
              ✨ Free Delivery on Orders Above ₹500
            </div>
          </div>

          {/* Main Header */}
          <div className="flex items-center justify-between py-4">
            {/* Logo and Brand */}
            <div
              className="flex items-center cursor-pointer"
              onClick={() => handleNavigation('/showcase')}
            >
              <div className="bg-gradient-to-r from-primary to-secondary p-2 md:p-3 rounded-full mr-3 md:mr-4">
                <span className="text-white text-lg md:text-xl font-bold">✦</span>
              </div>
              <div>
                <h1 className="text-lg md:text-2xl font-bold text-primary">RoyalSpicyMasala</h1>
                <p className="text-xs md:text-sm text-gray-600 hidden sm:block">Premium Spices & Masalas</p>
              </div>
            </div>


            {/* Search Bar */}
            <div className="hidden md:flex items-center flex-1 max-w-md mx-8">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Search spices, masalas..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="pl-10 pr-4 py-2 w-full border-gray-300 focus:border-primary focus:ring-primary"
                />
              </div>
            </div>

            {/* Cart and Mobile Menu */}
            <div className="flex items-center space-x-2 md:space-x-4">
              {/* Mix Calculator */}
              {onMixCalculatorClick && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onMixCalculatorClick}
                  className="border-orange-500 text-orange-600 hover:bg-orange-500 hover:text-white"
                >
                  <Calculator className="h-4 w-4 md:mr-2" />
                  <span className="hidden md:inline">Mix Calculator</span>
                </Button>
              )}

              {/* Shopping Cart */}
              <Button
                variant="outline"
                size="sm"
                onClick={onCartClick || (() => handleNavigation('/showcase/cart'))}
                className="relative border-primary text-primary hover:bg-primary hover:text-white"
              >
                <ShoppingCart className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Cart</span>
                {cartItemCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
                  >
                    {cartItemCount}
                  </Badge>
                )}
              </Button>

              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleMobileMenu}
                className="md:hidden"
              >
                {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>

          {/* Mobile Search Bar */}
          <div className="md:hidden pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="text"
                placeholder="Search spices, masalas..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="pl-10 pr-4 py-3 w-full border-gray-300 focus:border-primary focus:ring-primary text-base"
              />
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-200">
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-primary text-white mt-8 md:mt-16">
        <div className="container mx-auto px-4 py-8 md:py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 md:gap-8">
            {/* Company Info */}
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center mb-4">
                <div className="bg-secondary p-2 rounded-full mr-3">
                  <span className="text-white text-lg font-bold">✦</span>
                </div>
                <h3 className="text-lg md:text-xl font-bold">RoyalSpicyMasala</h3>
              </div>
              <p className="text-gray-300 mb-4 text-sm md:text-base">
                Premium quality spices and masalas sourced directly from the finest farms.
                Bringing authentic flavors to your kitchen since 1995.
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center">
                  <Phone className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span>+91 97027 13157</span>
                </div>
                <div className="flex items-center">
                  <Mail className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span className="break-all">orders@royalspicymasala.com</span>
                </div>
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span>Mumbai, Maharashtra, India</span>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-base md:text-lg font-semibold mb-3 md:mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Home</a></li>
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Products</a></li>
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Cart</a></li>
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Order Now</a></li>
              </ul>
            </div>

            {/* Customer Support */}
            <div>
              <h4 className="text-base md:text-lg font-semibold mb-3 md:mb-4">Customer Support</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Order Tracking</a></li>
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Return Policy</a></li>
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Shipping Info</a></li>
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors">FAQ</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-600 mt-6 md:mt-8 pt-6 md:pt-8 text-center text-xs md:text-sm text-gray-300">
            <p>&copy; 2024 RoyalSpicyMasala. All rights reserved. | Made with ❤️ for spice lovers</p>
          </div>
        </div>
      </footer>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes navGradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </div>
  );
}
