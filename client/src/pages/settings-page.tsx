import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import PageHeader from '@/components/common/page-header';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Input } from '@/components/ui/input';
import { Loader2, RefreshCw, RotateCw, Save, ShieldCheck, Upload, X } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface SystemSetting {
  id: number;
  key: string;
  value: string;
  description: string;
}

export default function SettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('general');
  const [lowStockThreshold, setLowStockThreshold] = useState('10');
  const [enableNotifications, setEnableNotifications] = useState(true);
  const [enableAutoBackup, setEnableAutoBackup] = useState(true);
  const [backupFrequency, setBackupFrequency] = useState('daily');
  const [dataRetentionPeriod, setDataRetentionPeriod] = useState('90');
  
  // Mock query for system settings (would be a real API call in production)
  const { data: systemSettings, isLoading } = useQuery<SystemSetting[]>({
    queryKey: ['/api/settings'],
    queryFn: async () => {
      // This would be a real API call in production
      return [
        { id: 1, key: 'low_stock_threshold', value: '10', description: 'Threshold for low stock alerts' },
        { id: 2, key: 'enable_notifications', value: 'true', description: 'Enable email notifications' },
        { id: 3, key: 'backup_frequency', value: 'daily', description: 'How often to back up data' },
        { id: 4, key: 'data_retention_period', value: '90', description: 'Days to keep data before archiving' }
      ];
    }
  });

  // Mock mutation for updating settings
  const updateSettingsMutation = useMutation({
    mutationFn: async (updatedSettings: any) => {
      // This would be a real API call in production
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay
      return updatedSettings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      toast({
        title: "Settings updated",
        description: "Your changes have been saved successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update settings",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleSaveGeneralSettings = () => {
    updateSettingsMutation.mutate({
      low_stock_threshold: lowStockThreshold,
      enable_notifications: enableNotifications
    });
  };

  const handleSaveBackupSettings = () => {
    updateSettingsMutation.mutate({
      enable_auto_backup: enableAutoBackup,
      backup_frequency: backupFrequency,
      data_retention_period: dataRetentionPeriod
    });
  };

  const handleManualBackup = () => {
    toast({
      title: "Backup started",
      description: "Manual backup has been initiated.",
    });
  };

  const handleClearCache = () => {
    toast({
      title: "Cache cleared",
      description: "Application cache has been cleared successfully.",
    });
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="container mx-auto py-10">
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <ShieldCheck className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold mb-2">Admin Access Required</h2>
          <p className="text-muted-foreground">You need admin privileges to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <PageHeader 
        title="System Settings" 
        description="Configure application settings and preferences"
      />
      
      <Tabs defaultValue="general" value={activeTab} onValueChange={setActiveTab} className="mt-8">
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="general">General Settings</TabsTrigger>
          <TabsTrigger value="backups">Backups & Data</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>
        
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>General Configuration</CardTitle>
              <CardDescription>Manage application-wide settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="lowStockThreshold">Low Stock Threshold</Label>
                <Input 
                  id="lowStockThreshold"
                  type="number" 
                  value={lowStockThreshold}
                  onChange={(e) => setLowStockThreshold(e.target.value)}
                  min="1"
                  max="100"
                />
                <p className="text-sm text-muted-foreground">
                  Items with stock below this level will trigger alerts
                </p>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="notifications">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive email alerts for important events
                  </p>
                </div>
                <Switch 
                  id="notifications"
                  checked={enableNotifications}
                  onCheckedChange={setEnableNotifications}
                />
              </div>
              
              <Separator className="my-4" />
              
              <div className="space-y-2">
                <Label>Default Currency</Label>
                <Select defaultValue="usd">
                  <SelectTrigger>
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="usd">USD ($)</SelectItem>
                    <SelectItem value="eur">EUR (€)</SelectItem>
                    <SelectItem value="gbp">GBP (£)</SelectItem>
                    <SelectItem value="jpy">JPY (¥)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Date Format</Label>
                <Select defaultValue="mdy">
                  <SelectTrigger>
                    <SelectValue placeholder="Select date format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mdy">MM/DD/YYYY</SelectItem>
                    <SelectItem value="dmy">DD/MM/YYYY</SelectItem>
                    <SelectItem value="ymd">YYYY/MM/DD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end space-x-2">
              <Button variant="outline">
                <RotateCw className="mr-2 h-4 w-4" />
                Reset
              </Button>
              <Button 
                onClick={handleSaveGeneralSettings}
                disabled={updateSettingsMutation.isPending}
              >
                {updateSettingsMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="backups">
          <Card>
            <CardHeader>
              <CardTitle>Backup & Data Management</CardTitle>
              <CardDescription>Configure data retention and backup settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="autoBackup">Automatic Backups</Label>
                  <p className="text-sm text-muted-foreground">
                    Regularly back up your data automatically
                  </p>
                </div>
                <Switch 
                  id="autoBackup"
                  checked={enableAutoBackup}
                  onCheckedChange={setEnableAutoBackup}
                />
              </div>
              
              {enableAutoBackup && (
                <div className="space-y-2">
                  <Label>Backup Frequency</Label>
                  <Select 
                    value={backupFrequency}
                    onValueChange={setBackupFrequency}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="retentionPeriod">Data Retention (days)</Label>
                <Input 
                  id="retentionPeriod"
                  type="number" 
                  value={dataRetentionPeriod}
                  onChange={(e) => setDataRetentionPeriod(e.target.value)}
                  min="1"
                />
                <p className="text-sm text-muted-foreground">
                  Number of days to keep data before archiving
                </p>
              </div>
              
              <Separator className="my-4" />
              
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Manual Operations</h3>
                
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    onClick={handleManualBackup}
                    className="flex-1"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Create Backup Now
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    onClick={handleClearCache}
                    className="flex-1"
                  >
                    <X className="mr-2 h-4 w-4" />
                    Clear Cache
                  </Button>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end space-x-2">
              <Button variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" />
                Reset
              </Button>
              <Button 
                onClick={handleSaveBackupSettings}
                disabled={updateSettingsMutation.isPending}
              >
                {updateSettingsMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>Manage security and access control</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="twoFactor">Two-Factor Authentication</Label>
                  <p className="text-sm text-muted-foreground">
                    Require 2FA for all admin users
                  </p>
                </div>
                <Switch id="twoFactor" />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="sessionTimeout">Auto Session Timeout</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically log out inactive users
                  </p>
                </div>
                <Switch id="sessionTimeout" defaultChecked />
              </div>
              
              <div className="space-y-2">
                <Label>Session Timeout (minutes)</Label>
                <Input type="number" defaultValue="30" min="5" max="120" />
              </div>
              
              <Separator className="my-4" />
              
              <div className="space-y-2">
                <Label>Password Policy</Label>
                <Select defaultValue="strong">
                  <SelectTrigger>
                    <SelectValue placeholder="Select password policy" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">Basic (min. 8 characters)</SelectItem>
                    <SelectItem value="medium">Medium (min. 8 chars with numbers)</SelectItem>
                    <SelectItem value="strong">Strong (min. 10 chars with numbers, symbols)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Password Expiry (days)</Label>
                <Input type="number" defaultValue="90" min="30" max="365" />
                <p className="text-sm text-muted-foreground">
                  Number of days before passwords must be changed (0 for never)
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end space-x-2">
              <Button variant="outline">
                <RotateCw className="mr-2 h-4 w-4" />
                Reset
              </Button>
              <Button>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}