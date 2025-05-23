import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useLocation, useSearch } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { loginSchema } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { AlertCircle, CheckCircle, Loader2, LogIn, Mail } from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const loginFormSchema = loginSchema;
type LoginFormValues = z.infer<typeof loginFormSchema>;

const forgotPasswordSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email" }),
});

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export default function AuthPage() {
  const { user, loginMutation } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const redirectTo = params.get("redirect") || "/";
  const [tab, setTab] = useState<"login" | "forgot">("login");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState("");
  const [tempPassword, setTempPassword] = useState("");

  useEffect(() => {
    if (user) {
      navigate(redirectTo);
    }
  }, [user, navigate, redirectTo]);

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const forgotPasswordForm = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onLoginSubmit = (data: LoginFormValues) => {
    console.log('Login form submitted with data:', data);
    loginMutation.mutate(data, {
      onSuccess: () => {
        console.log('Login successful, redirecting to:', redirectTo);
        navigate(redirectTo);
      },
      onError: (error) => {
        console.error('Login error in form submission:', error);
        toast({
          title: "Login failed",
          description: error.message || "Invalid username or password",
          variant: "destructive"
        });
      }
    });
  };

  const onForgotPasswordSubmit = async (data: ForgotPasswordValues) => {
    setIsSubmitting(true);
    setResetError("");
    setResetSuccess(false);
    setTempPassword("");

    try {
      const response = await apiRequest("POST", "/api/forgot-password", data);
      const result = await response.json();

      setResetSuccess(true);
      if (result.tempPassword) {
        setTempPassword(result.tempPassword);
      }

      toast({
        title: "Password reset request sent",
        description: "Check your email for further instructions",
      });
    } catch (error) {
      setResetError("An error occurred. Please try again.");
      toast({
        title: "Error",
        description: "Failed to process password reset",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-neutral-50">
      <div className="flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="mb-6 text-center">
              <div className="flex items-center justify-center mb-2">
                <span className="text-accent-dark text-3xl mr-2">✦</span>
                <h1 className="font-heading font-bold text-3xl">SpiceManager</h1>
              </div>
              <p className="text-neutral-600">Admin Dashboard Access</p>
            </div>

            <Tabs value={tab} onValueChange={(value) => setTab(value as "login" | "forgot")}>
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="login">Sign In</TabsTrigger>
                <TabsTrigger value="forgot">Forgot Password</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-md text-sm">
                  <p className="font-medium text-blue-700">Demo Credentials:</p>
                  <div className="mt-1 grid grid-cols-2 gap-x-4 text-blue-800">
                    <div>
                      <p><span className="font-semibold">Username:</span> admin</p>
                      <p><span className="font-semibold">Password:</span> admin123</p>
                    </div>
                    <div>
                      <p><span className="font-semibold">Username:</span> user</p>
                      <p><span className="font-semibold">Password:</span> password123</p>
                    </div>
                  </div>
                </div>

                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                    <FormField
                      control={loginForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter admin username" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Enter password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      className="w-full bg-primary"
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <LogIn className="mr-2 h-4 w-4" />
                      )}
                      Sign In
                    </Button>
                  </form>
                </Form>
              </TabsContent>

              <TabsContent value="forgot">
                {resetSuccess ? (
                  <div className="bg-green-50 rounded-lg p-4 space-y-3">
                    <div className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                      <h3 className="font-medium">Password Reset Request Sent</h3>
                    </div>
                    <p className="text-sm text-gray-600">
                      If the email address is registered in our system, you will receive instructions to reset your password.
                    </p>

                    {tempPassword && (
                      <div className="mt-4 p-3 border border-gray-200 rounded-md bg-gray-50">
                        <p className="text-sm font-semibold">Temporary Password (Demo Only):</p>
                        <div className="flex items-center justify-between mt-1">
                          <code className="bg-white px-2 py-1 rounded text-sm">{tempPassword}</code>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setTab("login")}
                          >
                            Return to Login
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <Form {...forgotPasswordForm}>
                    <form onSubmit={forgotPasswordForm.handleSubmit(onForgotPasswordSubmit)} className="space-y-4">
                      {resetError && (
                        <div className="flex items-center bg-red-50 text-red-600 p-3 rounded-md">
                          <AlertCircle className="h-5 w-5 mr-2" />
                          <p className="text-sm">{resetError}</p>
                        </div>
                      )}

                      <FormField
                        control={forgotPasswordForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email Address</FormLabel>
                            <FormControl>
                              <Input placeholder="admin@example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button
                        type="submit"
                        className="w-full"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Mail className="mr-2 h-4 w-4" />
                        )}
                        Reset Password
                      </Button>
                    </form>
                  </Form>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>

          <CardFooter className="flex justify-center pt-2 pb-6 text-xs text-gray-500">
            <p>Secure Admin Access - Unauthorized login attempts will be monitored</p>
          </CardFooter>
        </Card>
      </div>

      <div className="flex-1 hidden lg:block bg-primary">
        <div className="h-full flex flex-col justify-center items-center text-white p-10">
          <h2 className="text-4xl font-bold mb-6">Spice Inventory System</h2>
          <p className="text-xl mb-8 text-center max-w-lg">
            Comprehensive inventory management system for spices with vendor management, financial tracking, and barcode integration
          </p>
          <div className="grid grid-cols-2 gap-6 max-w-xl">
            <div className="bg-white/10 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Inventory Tracking</h3>
              <p className="text-sm">Manage spice quantities, batches, and expiration dates efficiently</p>
            </div>
            <div className="bg-white/10 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Vendor Management</h3>
              <p className="text-sm">Track vendor information, deliveries, and payment terms</p>
            </div>
            <div className="bg-white/10 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Financial Analytics</h3>
              <p className="text-sm">Monitor costs, payments, and generate financial reports</p>
            </div>
            <div className="bg-white/10 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Barcode Integration</h3>
              <p className="text-sm">Scan barcodes for quick inventory updates and tracking</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}