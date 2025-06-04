"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const PaymentDialog = DialogPrimitive.Root

const PaymentDialogTrigger = DialogPrimitive.Trigger

const PaymentDialogPortal = DialogPrimitive.Portal

const PaymentDialogClose = DialogPrimitive.Close

const PaymentDialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
))
PaymentDialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const PaymentDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <PaymentDialogPortal>
    <PaymentDialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 w-full max-w-4xl translate-x-[-50%] translate-y-[-50%] border bg-background shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
        "max-h-[95vh] overflow-hidden flex flex-col",
        className
      )}
      {...props}
    >
      {/* Header - Fixed */}
      <div className="flex-shrink-0 p-6 pb-0">
        <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground z-10">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </div>

      {/* Content - Scrollable */}
      <div className="flex-1 overflow-y-auto px-6 pb-6 payment-form-scroll">
        <div className="space-y-6">
          {children}
        </div>
      </div>
    </DialogPrimitive.Content>
  </PaymentDialogPortal>
))
PaymentDialogContent.displayName = DialogPrimitive.Content.displayName

const PaymentDialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left mb-4",
      className
    )}
    {...props}
  />
)
PaymentDialogHeader.displayName = "PaymentDialogHeader"

const PaymentDialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-6 pt-4 border-t bg-background sticky bottom-0",
      className
    )}
    {...props}
  />
)
PaymentDialogFooter.displayName = "PaymentDialogFooter"

const PaymentDialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
PaymentDialogTitle.displayName = DialogPrimitive.Title.displayName

const PaymentDialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
PaymentDialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  PaymentDialog,
  PaymentDialogPortal,
  PaymentDialogOverlay,
  PaymentDialogClose,
  PaymentDialogTrigger,
  PaymentDialogContent,
  PaymentDialogHeader,
  PaymentDialogFooter,
  PaymentDialogTitle,
  PaymentDialogDescription,
}
