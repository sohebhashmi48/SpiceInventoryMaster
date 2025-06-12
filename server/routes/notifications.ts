import { Router } from 'express';
import { getPaymentReminders } from '../storage.js';

const router = Router();

// Get payment reminder notifications
router.get('/payment-reminders', async (req, res) => {
  try {
    console.log('Getting payment reminder notifications...');
    
    // Get current date
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    // Get date 2 days from now for upcoming reminders
    const twoDaysFromNow = new Date();
    twoDaysFromNow.setDate(today.getDate() + 2);
    const twoDaysFromNowStr = twoDaysFromNow.toISOString().split('T')[0];
    
    // Get all distributions with pending payments and reminder dates
    const reminders = await getPaymentReminders(todayStr, twoDaysFromNowStr);
    
    console.log(`Found ${reminders.length} payment reminders`);
    
    res.json({
      success: true,
      data: reminders
    });
  } catch (error) {
    console.error('Error getting payment reminders:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

// Get all notifications (can be extended for other notification types)
router.get('/', async (req, res) => {
  try {
    console.log('Getting all notifications...');
    
    // Get current date
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    // Get date 2 days from now for upcoming reminders
    const twoDaysFromNow = new Date();
    twoDaysFromNow.setDate(today.getDate() + 2);
    const twoDaysFromNowStr = twoDaysFromNow.toISOString().split('T')[0];
    
    // Get payment reminders
    const paymentReminders = await getPaymentReminders(todayStr, twoDaysFromNowStr);
    
    // Format notifications
    const notifications = paymentReminders.map(reminder => ({
      id: `payment-${reminder.id}`,
      type: 'payment_reminder',
      title: `Payment Due: ${reminder.catererName}`,
      message: `₹${parseFloat(reminder.balanceDue).toLocaleString()} due on ${new Date(reminder.reminderDate).toLocaleDateString()}`,
      priority: reminder.reminderDate <= todayStr ? 'high' : 'medium',
      isOverdue: reminder.reminderDate < todayStr,
      data: {
        distributionId: reminder.id,
        catererId: reminder.catererId,
        catererName: reminder.catererName,
        billNo: reminder.billNo,
        balanceDue: reminder.balanceDue,
        reminderDate: reminder.reminderDate,
        nextPaymentDate: reminder.nextPaymentDate
      },
      createdAt: reminder.reminderDate
    }));
    
    console.log(`Formatted ${notifications.length} notifications`);
    
    res.json({
      success: true,
      data: notifications,
      count: notifications.length
    });
  } catch (error) {
    console.error('Error getting notifications:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

export default router;
