import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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
  AlertTriangle, Calendar as CalendarIcon, Bell, Clock,
  DollarSign, User, X, Plus, Check
} from 'lucide-react';
import { format, isAfter, isBefore, isToday, addDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';

interface PaymentReminder {
  id: string;
  catererName: string;
  amount: number;
  billNumber: string;
  originalDueDate: Date;
  reminderDate: Date;
  status: 'pending' | 'overdue' | 'due_today' | 'upcoming';
  isRead: boolean;
  isAcknowledged: boolean;
  acknowledgedAt?: Date;
  notes?: string;
}

interface NotificationSystemProps {
  reminders: PaymentReminder[];
  onUpdateReminder: (id: string, updates: Partial<PaymentReminder>) => void;
  onAddReminder: (reminder: Omit<PaymentReminder, 'id'>) => void;
  onDeleteReminder: (id: string) => void;
}

export default function NotificationSystem({
  reminders,
  onUpdateReminder,
  onAddReminder,
  onDeleteReminder
}: NotificationSystemProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
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
        return 'bg-red-500 text-white';
      case 'due_today':
        return 'bg-orange-500 text-white';
      case 'upcoming':
        return 'bg-yellow-500 text-black';
      default:
        return 'bg-blue-500 text-white';
    }
  };

  // Get urgency icon
  const getUrgencyIcon = (status: PaymentReminder['status']) => {
    switch (status) {
      case 'overdue':
        return <AlertTriangle className="h-4 w-4" />;
      case 'due_today':
        return <Clock className="h-4 w-4" />;
      case 'upcoming':
        return <Bell className="h-4 w-4" />;
      default:
        return <CalendarIcon className="h-4 w-4" />;
    }
  };

  // Filter reminders by selected date
  const filteredReminders = reminders.filter(reminder => {
    if (!selectedDate) return true;
    const reminderDate = new Date(reminder.reminderDate);
    return reminderDate.toDateString() === selectedDate.toDateString();
  });

  // Get today's notifications
  const todayNotifications = reminders.filter(reminder =>
    isToday(new Date(reminder.reminderDate)) && !reminder.isRead
  );

  // Show toast notifications for today's reminders
  useEffect(() => {
    todayNotifications.forEach(reminder => {
      toast({
        title: "Payment Reminder",
        description: `${reminder.catererName} - ₹${reminder.amount.toLocaleString()} due today`,
        variant: reminder.status === 'overdue' ? 'destructive' : 'default',
      });
    });
  }, [todayNotifications]);

  const handleAddReminder = () => {
    if (!newReminder.catererName || !newReminder.amount || !newReminder.billNumber) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const reminder: Omit<PaymentReminder, 'id'> = {
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

    onAddReminder(reminder);
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
    onUpdateReminder(id, { isRead: true });
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString()}`;
  };

  return (
    <div className="space-y-4">
      {/* Header with Add Reminder Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Bell className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Payment Reminders</h3>
          {todayNotifications.length > 0 && (
            <Badge variant="destructive" className="ml-2">
              {todayNotifications.length} due today
            </Badge>
          )}
        </div>

        <Dialog open={newReminderOpen} onOpenChange={setNewReminderOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
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
                <Label htmlFor="catererName">Reminder Name</Label>
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

      {/* Date Picker */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Filter by Date</CardTitle>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            className="rounded-md border"
          />
        </CardContent>
      </Card>

      {/* Reminders List */}
      <div className="space-y-3">
        {filteredReminders.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-gray-500">
              No reminders for {selectedDate ? format(selectedDate, "PPP") : "this date"}
            </CardContent>
          </Card>
        ) : (
          filteredReminders.map((reminder) => (
            <Card key={reminder.id} className={cn(
              "transition-all duration-200",
              !reminder.isRead && "ring-2 ring-primary/20"
            )}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <Badge className={getUrgencyColor(reminder.status)}>
                        {getUrgencyIcon(reminder.status)}
                        <span className="ml-1 capitalize">{reminder.status.replace('_', ' ')}</span>
                      </Badge>
                      {!reminder.isRead && (
                        <Badge variant="outline">New</Badge>
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">{reminder.catererName}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <DollarSign className="h-4 w-4 text-gray-500" />
                        <span className="text-lg font-semibold text-green-600">
                          {formatCurrency(reminder.amount)}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <CalendarIcon className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-600">
                          Bill #{reminder.billNumber} • Due: {format(new Date(reminder.originalDueDate), "PPP")}
                        </span>
                      </div>
                      {reminder.notes && (
                        <p className="text-sm text-gray-600 mt-2">{reminder.notes}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {!reminder.isRead && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => markAsRead(reminder.id)}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onDeleteReminder(reminder.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
