import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  DollarSign, User, X, Plus, Check, CreditCard, CheckCircle,
  Users, FileText
} from 'lucide-react';
import { format, isToday, isBefore, addDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';
import { Distribution } from '@/hooks/use-distributions';
import { Caterer } from '@/hooks/use-caterers';
import PaymentModal from '@/components/caterers/payment-modal';

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
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

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

  // Fetch payment reminders using React Query
  const { data: rawPaymentReminders, isLoading: remindersLoading } = useQuery<any[]>({
    queryKey: ['payment-reminders'],
    queryFn: async () => {
      // First trigger cleanup
      try {
        await fetch('/api/payment-reminders/cleanup', {
          method: 'POST',
          credentials: 'include',
        });
      } catch (error) {
        console.warn('Cleanup failed, continuing with fetch:', error);
      }

      const response = await fetch('/api/payment-reminders', {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch payment reminders');
      }
      return response.json();
    },
    enabled: !!caterers && !!distributions, // Only fetch when caterers and distributions are loaded
  });

  // Get caterer name by ID
  const getCatererName = (catererId: number) => {
    const caterer = caterers?.find(c => c.id === catererId);
    return caterer ? caterer.name : 'Unknown Caterer';
  };

  // State for notifications
  const [shownToasts, setShownToasts] = useState<Set<string>>(new Set());

  // Process payment reminders data
  const customReminders = rawPaymentReminders
    ? rawPaymentReminders
        .map((reminder: any) => ({
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
        }))
        .filter((reminder: any) => {
          // Check if reminder has a future next reminder date - if so, hide it until that date
          if (reminder.nextReminderDate) {
            const nextReminderDate = new Date(reminder.nextReminderDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            nextReminderDate.setHours(0, 0, 0, 0);

            // Hide reminder if next reminder date is in the future
            if (nextReminderDate > today) {
              console.log(`Hiding reminder ${reminder.id} until next reminder date: ${nextReminderDate.toDateString()}`);
              return false;
            }
          }

          // If reminder has a distributionId, check if that distribution is still pending
          if (reminder.distributionId && distributions) {
            const distribution = distributions.find(d => d.id === reminder.distributionId);
            if (distribution) {
              const balanceDue = Number(distribution.balanceDue);
              const status = distribution.status;

              // More aggressive filtering: exclude if balance is 0 or negative, or status is paid/cancelled
              if (balanceDue <= 0 || status === 'paid' || status === 'cancelled') {
                console.log(`Filtering out reminder for distribution ${distribution.id}: balance=${balanceDue}, status=${status}`);
                return false;
              }

              return true;
            } else {
              // Distribution not found, filter out this reminder
              console.log(`Filtering out reminder for non-existent distribution ${reminder.distributionId}`);
              return false;
            }
          }

          // For general reminders (no distributionId), check if caterer has any pending bills
          if (!reminder.distributionId && distributions) {
            const catererPendingBills = distributions.filter(d =>
              d.catererId === reminder.catererId &&
              Number(d.balanceDue) > 0 &&
              d.status !== 'paid'
            );

            if (catererPendingBills.length === 0) {
              console.log(`Filtering out general reminder for caterer ${reminder.catererId}: no pending bills`);
              return false;
            }
          }

          return true;
        })
    : [];

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
    id: `dist-${dist.id}`, // Prefix to avoid ID conflicts
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

  // Only show custom reminders from database, not auto-generated ones
  // This prevents duplicates and confusion
  const allReminders = customReminders;

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
    // Check if reminder has a future next reminder date - if so, don't show as urgent
    if (reminder.nextReminderDate) {
      const nextReminderDate = new Date(reminder.nextReminderDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      nextReminderDate.setHours(0, 0, 0, 0);

      // Don't show as urgent if next reminder date is in the future
      if (nextReminderDate > today) {
        return false;
      }
    }

    const reminderDate = new Date(reminder.reminderDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    reminderDate.setHours(0, 0, 0, 0);

    // Don't show acknowledged notifications that were acknowledged less than 24 hours ago
    if (reminder.isAcknowledged && reminder.acknowledgedAt) {
      const acknowledgedTime = new Date(reminder.acknowledgedAt);
      const hoursSinceAcknowledged = (Date.now() - acknowledgedTime.getTime()) / (1000 * 60 * 60);

      // Don't show if acknowledged less than 24 hours ago
      if (hoursSinceAcknowledged < 24) {
        return false;
      }
    }

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

  const handleAddReminder = async () => {
    if (!newReminder.catererName || !newReminder.amount || !newReminder.billNumber) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      // Find the caterer ID from the name
      const caterer = caterers?.find(c => c.name === newReminder.catererName);

      const reminderData = {
        catererId: caterer?.id,
        amount: parseFloat(newReminder.amount),
        originalDueDate: newReminder.originalDueDate,
        reminderDate: newReminder.reminderDate,
        notes: `${newReminder.billNumber} - ${newReminder.notes}`.trim()
      };

      const response = await fetch('/api/payment-reminders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(reminderData),
      });

      if (!response.ok) {
        throw new Error('Failed to create payment reminder');
      }

      // Invalidate the payment reminders query to refresh the data
      queryClient.invalidateQueries({ queryKey: ['payment-reminders'] });

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
    } catch (error) {
      console.error('Error creating reminder:', error);
      toast({
        title: "Error",
        description: "Failed to create payment reminder",
        variant: "destructive",
      });
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const response = await fetch(`/api/payment-reminders/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ isRead: true }),
      });

      if (!response.ok) {
        throw new Error('Failed to mark reminder as read');
      }

      // Invalidate the payment reminders query to refresh the data
      queryClient.invalidateQueries({ queryKey: ['payment-reminders'] });
    } catch (error) {
      console.error('Error marking reminder as read:', error);
      toast({
        title: "Error",
        description: "Failed to mark reminder as read",
        variant: "destructive",
      });
    }
  };

  const deleteReminder = async (id: string) => {
    try {
      const response = await fetch(`/api/payment-reminders/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete reminder');
      }

      // Invalidate the payment reminders query to refresh the data
      queryClient.invalidateQueries({ queryKey: ['payment-reminders'] });

      toast({
        title: "Reminder Deleted",
        description: "Payment reminder has been removed",
      });
    } catch (error) {
      console.error('Error deleting reminder:', error);
      toast({
        title: "Error",
        description: "Failed to delete reminder",
        variant: "destructive",
      });
    }
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

        // Invalidate the payment reminders query to refresh the data
        queryClient.invalidateQueries({ queryKey: ['payment-reminders'] });

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

        // Invalidate the payment reminders query to refresh the data
        queryClient.invalidateQueries({ queryKey: ['payment-reminders'] });
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
  if (distributionsLoading || caterersLoading || remindersLoading) {
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
          <div className="col-span-full">
            {/* Check if there are any pending distributions */}
            {(distributions?.filter(dist => Number(dist.balanceDue) > 0).length || 0) === 0 ? (
              // No pending bills at all
              <Card className="border-green-200 bg-green-50">
                <CardContent className="py-12 text-center">
                  <div className="flex flex-col items-center space-y-4">
                    <div className="p-4 bg-green-100 rounded-full">
                      <CheckCircle className="h-12 w-12 text-green-600" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-semibold text-green-900">All Payments Up to Date! 🎉</h3>
                      <p className="text-green-700 max-w-md">
                        Excellent! All your caterers have paid their bills. No payment reminders needed right now.
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 mt-6">
                      <Button
                        onClick={() => window.location.href = '/caterers'}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Users className="h-4 w-4 mr-2" />
                        View Caterers
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => window.location.href = '/caterer-payments'}
                        className="border-green-600 text-green-600 hover:bg-green-50"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        View Bills
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              // There are pending bills but no custom reminders set
              <Card className="border-orange-200 bg-orange-50">
                <CardContent className="py-12 text-center">
                  <div className="flex flex-col items-center space-y-4">
                    <div className="p-4 bg-orange-100 rounded-full">
                      <Bell className="h-12 w-12 text-orange-600" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-semibold text-orange-900">No Custom Reminders Set</h3>
                      <p className="text-orange-700 max-w-md">
                        You have {distributions?.filter(dist => Number(dist.balanceDue) > 0).length || 0} pending bill{(distributions?.filter(dist => Number(dist.balanceDue) > 0).length || 0) > 1 ? 's' : ''}, but no custom payment reminders are set up yet.
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 mt-6">
                      <Button
                        onClick={() => navigate('/caterers/pending-bills')}
                        className="bg-orange-600 hover:bg-orange-700"
                      >
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        View Pending Bills ({distributions?.filter(dist => Number(dist.balanceDue) > 0).length || 0})
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setNewReminderOpen(true)}
                        className="border-orange-600 text-orange-600 hover:bg-orange-50"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create Custom Reminder
                      </Button>
                    </div>
                    <div className="mt-6 p-4 bg-white rounded-lg border border-orange-200 max-w-lg">
                      <h4 className="font-medium text-orange-900 mb-2">💡 What are Payment Reminders?</h4>
                      <p className="text-sm text-orange-700">
                        Payment reminders help you track when to follow up on partial payments or set custom reminder dates for future collections.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          activeReminders.map((reminder) => (
            <Card key={reminder.id} className={cn(
              "transition-all duration-200 hover:shadow-md",
              !reminder.isRead && "ring-2 ring-primary/20"
            )}>
              <CardContent className="p-0">
                {/* Header Section */}
                <div className="p-4 pb-3 border-b border-gray-100">
                  <div className="flex items-center justify-between mb-3">
                    <Badge className={cn("text-xs font-medium", getUrgencyColor(reminder.status))}>
                      {getUrgencyIcon(reminder.status)}
                      <span className="ml-1 capitalize">{reminder.status.replace('_', ' ')}</span>
                    </Badge>
                    {!reminder.isRead && (
                      <Badge variant="secondary" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                        New
                      </Badge>
                    )}
                  </div>

                  {/* Caterer Name */}
                  <div className="flex items-center space-x-2 mb-2">
                    <User className="h-4 w-4 text-gray-500 flex-shrink-0" />
                    <span className="font-semibold text-gray-900 truncate">{reminder.catererName}</span>
                  </div>

                  {/* Amount - Prominent Display */}
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">₹</span>
                    <span className="text-2xl font-bold text-red-600">
                      {reminder.amount.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Bill Details Section */}
                <div className="p-4 py-3 bg-gray-50">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-500 block text-xs">Bill Number</span>
                      <span className="font-medium text-gray-900">#{reminder.billNumber}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-xs">Due Date</span>
                      <span className="font-medium text-gray-900">
                        {format(new Date(reminder.originalDueDate), "MMM dd, yyyy")}
                      </span>
                    </div>
                  </div>

                  {/* Next Reminder Date Display */}
                  {reminder.nextReminderDate && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Bell className="h-4 w-4 text-blue-500" />
                          <span className="text-xs text-gray-500">Next Reminder</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                            {format(new Date(reminder.nextReminderDate), "MMM dd, yyyy")}
                          </Badge>
                          {(() => {
                            const nextDate = new Date(reminder.nextReminderDate);
                            const today = new Date();
                            const diffDays = Math.ceil((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

                            if (diffDays === 0) {
                              return <Badge className="text-xs bg-orange-100 text-orange-800 border-orange-200">Today</Badge>;
                            } else if (diffDays === 1) {
                              return <Badge className="text-xs bg-yellow-100 text-yellow-800 border-yellow-200">Tomorrow</Badge>;
                            } else if (diffDays > 1) {
                              return <Badge variant="secondary" className="text-xs">in {diffDays} days</Badge>;
                            }
                            return null;
                          })()}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Set/Update Next Reminder Section */}
                <div className="p-4 py-3 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Bell className="h-4 w-4 text-orange-500" />
                      <span className="text-sm font-medium text-gray-700">
                        {reminder.nextReminderDate ? "Update Reminder" : "Set Next Reminder"}
                      </span>
                    </div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs px-3 border-orange-200 hover:bg-orange-50"
                        >
                          {reminder.nextReminderDate ? "Change Date" : "Set Date"}
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
                          disabled={(date) => date < new Date()}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* Action Buttons Section */}
                <div className="p-4 pt-0">
                  <div className="flex items-center justify-between space-x-2">
                    <PaymentModal
                      triggerText="Record Payment"
                      triggerSize="sm"
                      triggerClassName="flex-1 bg-green-600 hover:bg-green-700 text-white"
                      preselectedCatererId={caterers?.find(c => c.name === reminder.catererName)?.id?.toString()}
                      preselectedDistributionId={reminder.distributionId?.toString()}
                      preselectedAmount={reminder.amount.toString()}
                      onSuccess={() => {
                        // Refresh the data
                        queryClient.invalidateQueries({ queryKey: ['payment-reminders'] });
                        queryClient.invalidateQueries({ queryKey: ['distributions'] });
                      }}
                    >
                      <Button
                        size="sm"
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                      >
                        <CreditCard className="h-4 w-4 mr-2" />
                        Record Payment
                      </Button>
                    </PaymentModal>
                    <div className="flex items-center space-x-1">
                      {!reminder.isRead && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 p-0 border-green-200 hover:bg-green-50"
                          onClick={() => markAsRead(reminder.id)}
                          title="Mark as read"
                        >
                          <Check className="h-4 w-4 text-green-600" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 p-0 border-red-200 hover:bg-red-50"
                        onClick={() => deleteReminder(reminder.id)}
                        title="Delete reminder"
                      >
                        <X className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Hidden Reminders Info */}
      {(() => {
        const hiddenReminders = customReminders?.filter((reminder: any) => {
          if (reminder.nextReminderDate) {
            const nextReminderDate = new Date(reminder.nextReminderDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            nextReminderDate.setHours(0, 0, 0, 0);
            return nextReminderDate > today;
          }
          return false;
        }) || [];

        if (hiddenReminders.length > 0) {
          return (
            <div className="mt-4">
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Bell className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">
                      {hiddenReminders.length} reminder{hiddenReminders.length > 1 ? 's' : ''} scheduled for later
                    </span>
                  </div>
                  <p className="text-xs text-blue-700 mb-3">
                    These reminders are hidden until their next reminder date arrives.
                  </p>
                  <div className="space-y-2">
                    {hiddenReminders.slice(0, 3).map((reminder: any) => (
                      <div key={reminder.id} className="flex items-center justify-between bg-white rounded p-2 border border-blue-200">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-medium text-gray-900">{reminder.catererName}</span>
                          <span className="text-xs text-gray-500">₹{reminder.amount.toLocaleString()}</span>
                        </div>
                        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                          {format(new Date(reminder.nextReminderDate), "MMM dd")}
                        </Badge>
                      </div>
                    ))}
                    {hiddenReminders.length > 3 && (
                      <div className="text-center">
                        <span className="text-xs text-blue-600">
                          +{hiddenReminders.length - 3} more scheduled reminders
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        }
        return null;
      })()}

      {/* View All Link */}
      {allReminders.length > 3 && (
        <div className="text-center mt-4">
          <Button variant="link" className="text-sm">
            View All {allReminders.length} Reminders
          </Button>
        </div>
      )}
    </div>
  );
}
