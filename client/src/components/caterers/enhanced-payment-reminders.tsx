import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  AlertTriangle, Calendar as CalendarIcon, Bell, Clock,
  DollarSign, User, X, Plus, Check, CreditCard
} from 'lucide-react';
import { format, isToday, isBefore, addDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';
import { Distribution } from '@/hooks/use-distributions';
import { Caterer } from '@/hooks/use-caterers';

interface PaymentReminder {
  id: string;
  catererName: string;
  amount: number;
  billNumber: string;
  originalDueDate: Date;
  reminderDate: Date;
  nextReminderDate?: Date;
  status: 'pending' | 'overdue' | 'due_today' | 'upcoming';
  isRead: boolean;
  isAcknowledged: boolean;
  acknowledgedAt?: Date;
  distributionId?: number;
  notes?: string;
}

interface EnhancedPaymentRemindersProps {
  className?: string;
}

export default function EnhancedPaymentReminders({ className }: EnhancedPaymentRemindersProps) {
  // Fetch distributions with pending balances
  const { data: distributions, isLoading: distributionsLoading } = useQuery<Distribution[]>({
    queryKey: ['distributions'],
    queryFn: async () => {
      const response = await fetch('/api/distributions', {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch distributions');
      }
      return response.json();
    },
  });

  // Fetch all caterers
  const { data: caterers, isLoading: caterersLoading } = useQuery<Caterer[]>({
    queryKey: ['caterers'],
    queryFn: async () => {
      const response = await fetch('/api/caterers', {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch caterers');
      }
      return response.json();
    },
  });

  // Get caterer name by ID
  const getCatererName = (catererId: number) => {
    const caterer = caterers?.find(c => c.id === catererId);
    return caterer ? caterer.name : 'Unknown Caterer';
  };

  // State for custom reminders and notifications
  const [customReminders, setCustomReminders] = useState<PaymentReminder[]>([]);
  const [shownToasts, setShownToasts] = useState<Set<string>>(new Set());

  // Fetch existing payment reminders from the server
  useEffect(() => {
    const fetchPaymentReminders = async () => {
      try {
        const response = await fetch('/api/payment-reminders', {
          credentials: 'include',
        });
        if (response.ok) {
          const reminders = await response.json();
          // Map server reminders to include caterer names
          const mappedReminders = reminders.map((reminder: any) => ({
            ...reminder,
            originalDueDate: new Date(reminder.originalDueDate),
            reminderDate: new Date(reminder.reminderDate),
            nextReminderDate: reminder.nextReminderDate ? new Date(reminder.nextReminderDate) : undefined,
            acknowledgedAt: reminder.acknowledgedAt ? new Date(reminder.acknowledgedAt) : undefined,
            catererName: getCatererName(reminder.catererId),
            billNumber: reminder.notes?.includes('Bill') ?
              reminder.notes.split(' ')[1] :
              `R-${reminder.id.slice(0, 8)}`,
            isAcknowledged: Boolean(reminder.isAcknowledged)
          }));
          setCustomReminders(mappedReminders);
        }
      } catch (error) {
        console.error('Error fetching payment reminders:', error);
      }
    };

    if (caterers && caterers.length > 0) {
      fetchPaymentReminders();
    }
  }, [caterers]);

  // Convert distributions to reminders format, but exclude those that already have payment reminders
  const remindersFromDistributions = distributions?.filter(
    dist => {
      // Only include distributions with balance due and not paid/cancelled
      if (Number(dist.balanceDue) <= 0 || dist.status === 'paid' || dist.status === 'cancelled') {
        return false;
      }

      // Exclude distributions that already have a payment reminder
      const hasPaymentReminder = customReminders.some(reminder =>
        reminder.distributionId === dist.id
      );

      return !hasPaymentReminder;
    }
  ).map(dist => ({
    id: dist.id.toString(),
    catererName: getCatererName(dist.catererId),
    amount: Number(dist.balanceDue),
    billNumber: dist.billNo,
    originalDueDate: new Date(dist.distributionDate),
    reminderDate: new Date(dist.distributionDate),
    nextReminderDate: undefined,
    status: 'overdue' as const,
    isRead: false,
    isAcknowledged: false,
    distributionId: dist.id,
    notes: `Bill ${dist.billNo} - ${dist.status}`
  })) || [];

  // Combine real data with custom reminders
  const allReminders = [...remindersFromDistributions, ...customReminders];

  const [newReminderOpen, setNewReminderOpen] = useState(false);
  const [newReminder, setNewReminder] = useState({
    catererName: '',
    amount: '',
    billNumber: '',
    originalDueDate: new Date(),
    reminderDate: new Date(),
    notes: ''
  });

  // Calculate reminder status based on dates
  const calculateStatus = (reminderDate: Date): PaymentReminder['status'] => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const reminder = new Date(reminderDate);
    reminder.setHours(0, 0, 0, 0);

    if (isBefore(reminder, today)) return 'overdue';
    if (isToday(reminder)) return 'due_today';
    if (isBefore(reminder, addDays(today, 2))) return 'upcoming'; // Changed from 7 to 2 days
    return 'pending';
  };

  // Get urgency color based on status
  const getUrgencyColor = (status: PaymentReminder['status']) => {
    switch (status) {
      case 'overdue':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'due_today':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'upcoming':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  // Get urgency icon
  const getUrgencyIcon = (status: PaymentReminder['status']) => {
    switch (status) {
      case 'overdue':
        return <AlertTriangle className="h-3 w-3" />;
      case 'due_today':
        return <Clock className="h-3 w-3" />;
      case 'upcoming':
        return <Bell className="h-3 w-3" />;
      default:
        return <CalendarIcon className="h-3 w-3" />;
    }
  };

  // Get notifications for reminders due within 2 days (including today)
  const urgentNotifications = allReminders.filter(reminder => {
    const reminderDate = new Date(reminder.reminderDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    reminderDate.setHours(0, 0, 0, 0);

    // Show notifications for overdue, due today, or due within 2 days
    return (
      !reminder.isRead &&
      (isBefore(reminderDate, today) || isToday(reminderDate) || isBefore(reminderDate, addDays(today, 2)))
    );
  });

  // Show toast notifications for urgent reminders (only once per session)
  useEffect(() => {
    urgentNotifications.forEach(reminder => {
      if (!Array.from(shownToasts).includes(reminder.id)) {
        const daysUntilDue = Math.ceil((new Date(reminder.reminderDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        let description = '';

        if (daysUntilDue < 0) {
          description = `${reminder.catererName} - ₹${reminder.amount.toLocaleString()} overdue`;
        } else if (daysUntilDue === 0) {
          description = `${reminder.catererName} - ₹${reminder.amount.toLocaleString()} due today`;
        } else if (daysUntilDue === 1) {
          description = `${reminder.catererName} - ₹${reminder.amount.toLocaleString()} due tomorrow`;
        } else {
          description = `${reminder.catererName} - ₹${reminder.amount.toLocaleString()} due in ${daysUntilDue} days`;
        }

        toast({
          title: "Payment Reminder",
          description,
          variant: reminder.status === 'overdue' ? 'destructive' : 'default',
        });
        setShownToasts(prev => new Set([...Array.from(prev), reminder.id]));
      }
    });
  }, [urgentNotifications]);

  const handleAddReminder = () => {
    if (!newReminder.catererName || !newReminder.amount || !newReminder.billNumber) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const reminder: PaymentReminder = {
      id: Date.now().toString(),
      catererName: newReminder.catererName,
      amount: parseFloat(newReminder.amount),
      billNumber: newReminder.billNumber,
      originalDueDate: newReminder.originalDueDate,
      reminderDate: newReminder.reminderDate,
      status: calculateStatus(newReminder.reminderDate),
      isRead: false,
      isAcknowledged: false,
      notes: newReminder.notes
    };

    setCustomReminders(prev => [...prev, reminder]);
    setNewReminderOpen(false);
    setNewReminder({
      catererName: '',
      amount: '',
      billNumber: '',
      originalDueDate: new Date(),
      reminderDate: new Date(),
      notes: ''
    });

    toast({
      title: "Reminder Added",
      description: "Payment reminder has been created successfully",
    });
  };

  const markAsRead = (id: string) => {
    setCustomReminders(prev => prev.map(reminder =>
      reminder.id === id ? { ...reminder, isRead: true } : reminder
    ));
  };

  const deleteReminder = (id: string) => {
    setCustomReminders(prev => prev.filter(reminder => reminder.id !== id));
    toast({
      title: "Reminder Deleted",
      description: "Payment reminder has been removed",
    });
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString()}`;
  };

  // Get active reminders (limit to 3 for horizontal display)
  const activeReminders = allReminders.slice(0, 3);

  // Update the handleNextReminderUpdate function
  const handleNextReminderUpdate = async (reminderId: string, date: Date) => {
    try {
      // Check if this is a distribution-based reminder (numeric ID) or a real payment reminder (UUID)
      const isDistributionReminder = /^\d+$/.test(reminderId);

      if (isDistributionReminder) {
        // For distribution-based reminders, we need to create a new payment reminder
        const distributionReminder = remindersFromDistributions.find(r => r.id === reminderId);
        if (!distributionReminder) {
          throw new Error('Distribution reminder not found');
        }

        // Find the caterer ID from the distribution
        const distribution = distributions?.find(d => d.id.toString() === reminderId);
        if (!distribution) {
          throw new Error('Distribution not found');
        }

        // Create a new payment reminder
        const newReminderData = {
          catererId: distribution.catererId,
          distributionId: distribution.id,
          amount: Number(distribution.balanceDue),
          originalDueDate: new Date(distribution.distributionDate),
          reminderDate: new Date(distribution.distributionDate),
          nextReminderDate: date,
          status: 'pending',
          notes: `Bill ${distribution.billNo} - ${distribution.status}`
        };

        const response = await fetch('/api/payment-reminders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(newReminderData),
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Failed to create payment reminder');
        }

        const newReminder = await response.json();

        // Add to custom reminders
        setCustomReminders(prev => [...prev, {
          ...newReminder,
          catererName: getCatererName(newReminder.catererId),
          billNumber: distribution.billNo
        }]);

      } else {
        // For real payment reminders, update normally
        const response = await fetch(`/api/payment-reminders/${reminderId}/next-reminder`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ nextReminderDate: date }),
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Failed to update reminder');
        }

        // Update local state
        setCustomReminders(prev => prev.map(r =>
          r.id === reminderId
            ? { ...r, nextReminderDate: date }
            : r
        ));
      }

      // Show success toast
      toast({
        title: "Reminder Updated",
        description: `Next reminder set for ${format(date, "MMM dd, yyyy")}`,
      });
    } catch (error) {
      console.error('Error updating reminder:', error);
      toast({
        title: "Failed to Update Reminder",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    }
  };

  // Show loading state
  if (distributionsLoading || caterersLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center space-x-2">
          <Bell className="h-5 w-5 text-red-500" />
          <h3 className="text-lg font-semibold">Payment Reminders</h3>
        </div>
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p>Loading reminders...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Bell className="h-5 w-5 text-red-500" />
          <h3 className="text-lg font-semibold">Payment Reminders</h3>
          {urgentNotifications.length > 0 && (
            <Badge variant="destructive" className="ml-2">
              {urgentNotifications.length}
            </Badge>
          )}
        </div>

        <Dialog open={newReminderOpen} onOpenChange={setNewReminderOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Reminder
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Payment Reminder</DialogTitle>
              <DialogDescription>
                Set a reminder for an upcoming payment due date
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="catererName">Caterer Name *</Label>
                <Input
                  id="catererName"
                  value={newReminder.catererName}
                  onChange={(e) => setNewReminder(prev => ({ ...prev, catererName: e.target.value }))}
                  placeholder="Enter caterer name"
                />
              </div>
              <div>
                <Label htmlFor="amount">Amount (₹) *</Label>
                <Input
                  id="amount"
                  type="number"
                  value={newReminder.amount}
                  onChange={(e) => setNewReminder(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="Enter amount"
                />
              </div>
              <div>
                <Label htmlFor="billNumber">Bill Number *</Label>
                <Input
                  id="billNumber"
                  value={newReminder.billNumber}
                  onChange={(e) => setNewReminder(prev => ({ ...prev, billNumber: e.target.value }))}
                  placeholder="Enter bill number"
                />
              </div>
              <div>
                <Label>Reminder Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(newReminder.reminderDate, "PPP")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={newReminder.reminderDate}
                      onSelect={(date) => date && setNewReminder(prev => ({ ...prev, reminderDate: date }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Input
                  id="notes"
                  value={newReminder.notes}
                  onChange={(e) => setNewReminder(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setNewReminderOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddReminder}>
                Add Reminder
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Horizontal Reminders Display */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {activeReminders.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="py-8 text-center text-gray-500">
              <Bell className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p>No payment reminders</p>
            </CardContent>
          </Card>
        ) : (
          activeReminders.map((reminder) => (
            <Card key={reminder.id} className={cn(
              "transition-all duration-200 hover:shadow-md",
              !reminder.isRead && "ring-2 ring-primary/20"
            )}>
              <CardContent className="p-4">
                <div className="space-y-3">
                  {/* Status Badge */}
                  <div className="flex items-center justify-between">
                    <Badge className={cn("text-xs", getUrgencyColor(reminder.status))}>
                      {getUrgencyIcon(reminder.status)}
                      <span className="ml-1 capitalize">{reminder.status.replace('_', ' ')}</span>
                    </Badge>
                    {!reminder.isRead && (
                      <Badge variant="outline" className="text-xs">New</Badge>
                    )}
                  </div>

                  {/* Caterer Info */}
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-gray-500" />
                      <span className="font-medium text-sm truncate">{reminder.catererName}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <DollarSign className="h-4 w-4 text-gray-500" />
                      <span className="text-lg font-semibold text-red-600">
                        {formatCurrency(reminder.amount)}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600">
                      Bill #{reminder.billNumber}
                    </div>
                    <div className="text-xs text-gray-500">
                      Due: {format(new Date(reminder.originalDueDate), "MMM dd, yyyy")}
                    </div>

                    {/* Next Reminder Date */}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                      <div className="flex items-center space-x-2">
                        <Bell className="h-4 w-4 text-gray-500" />
                        <span className="text-xs text-gray-600">Next Reminder:</span>
                      </div>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs px-2"
                          >
                            {reminder.nextReminderDate
                              ? format(new Date(reminder.nextReminderDate), "MMM dd, yyyy")
                              : "Set Reminder"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                          <Calendar
                            mode="single"
                            selected={reminder.nextReminderDate ? new Date(reminder.nextReminderDate) : undefined}
                            onSelect={(date) => {
                              if (!date) return;
                              handleNextReminderUpdate(reminder.id, date);
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs px-2 py-1 h-7"
                      onClick={() => window.location.href = `/caterer-payments/new?catererId=${reminder.catererName}&amount=${reminder.amount}&distributionId=${reminder.billNumber}`}
                    >
                      <CreditCard className="h-3 w-3 mr-1" />
                      Record Payment
                    </Button>
                    <div className="flex items-center space-x-1">
                      {!reminder.isRead && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => markAsRead(reminder.id)}
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                        onClick={() => deleteReminder(reminder.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* View All Link */}
      {allReminders.length > 3 && (
        <div className="text-center">
          <Button variant="link" className="text-sm">
            View All {allReminders.length} Reminders
          </Button>
        </div>
      )}
    </div>
  );
}
