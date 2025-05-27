import React from 'react';
import { Phone, Mail, Globe } from 'lucide-react';

interface CatererBillHeaderProps {
  companyName: string;
  companyTagline?: string;
  companyPhone?: string;
  companyEmail?: string;
  companyWebsite?: string;
  logoUrl?: string;
}

export default function CatererBillHeader({
  companyName = "Royal Spicy Masala",
  companyTagline = "Premium Products & Dry Fruits Wholesaler",
  companyPhone = "+91-9876543210",
  companyEmail = "info@royalspicy.com",
  companyWebsite = "www.royalspicy.com",
  logoUrl
}: CatererBillHeaderProps) {
  // Generate initials for the logo if no logo URL is provided
  const initials = companyName
    .split(' ')
    .map(word => word[0])
    .join('')
    .substring(0, 3)
    .toUpperCase();

  return (
    <div className="w-full bg-white rounded-lg overflow-hidden border-b">
      <div className="p-6 flex items-center gap-4 bg-gradient-to-r from-primary/10 to-primary/5">
        {/* Logo or Initials */}
        {logoUrl ? (
          <img src={logoUrl} alt={companyName} className="w-16 h-16 rounded-full object-cover" />
        ) : (
          <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-white font-bold text-xl">
            {initials}
          </div>
        )}

        {/* Company Info */}
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-primary">{companyName}</h1>
          <p className="text-sm text-muted-foreground">{companyTagline}</p>
        </div>

        {/* Contact Info */}
        <div className="flex flex-col gap-1 text-sm">
          {companyPhone && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-primary" />
              <span>{companyPhone}</span>
            </div>
          )}
          {companyEmail && (
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" />
              <span>{companyEmail}</span>
            </div>
          )}
          {companyWebsite && (
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" />
              <span>{companyWebsite}</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Optional: Tagline or Message */}
      <div className="px-6 py-3 bg-gray-50 text-center text-sm italic text-muted-foreground border-t border-b">
        <p>We are a trusted wholesale supplier delivering top-grade products and dry fruits to businesses nationwide with unbeatable quality and service.</p>
      </div>
    </div>
  );
}
