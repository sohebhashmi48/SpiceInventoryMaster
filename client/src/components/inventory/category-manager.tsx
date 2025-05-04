import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Category, insertCategorySchema } from "@shared/schema";
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
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Loader2, Plus, Edit, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const categoryFormSchema = insertCategorySchema.extend({});

type CategoryFormValues = z.infer<typeof categoryFormSchema>;

export default function CategoryManager() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  
  const { data: categories, isLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });
  
  const createCategoryMutation = useMutation({
    mutationFn: async (data: CategoryFormValues) => {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        credentials: 'include'
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || 'Failed to create category');
      }
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Category created successfully",
        description: "The new category has been added.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      setIsAddDialogOpen(false);
      form.reset({
        name: "",
        description: ""
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to create category",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Initialize the form with default values
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: "",
      description: ""
    },
  });
  
  const onSubmit = (data: CategoryFormValues) => {
    createCategoryMutation.mutate(data);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Spice Categories</h3>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-1" /> Add Category
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Category</DialogTitle>
              <DialogDescription>
                Create a new category for classifying spices.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter category name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter category description" 
                          value={field.value || ""} 
                          onChange={field.onChange} 
                          onBlur={field.onBlur}
                          ref={field.ref}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-end space-x-2">
                  <Button 
                    variant="outline" 
                    type="button" 
                    onClick={() => setIsAddDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createCategoryMutation.isPending}
                    className="bg-secondary hover:bg-secondary-dark text-white"
                  >
                    {createCategoryMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Save Category
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
        {isLoading ? (
          Array(6).fill(0).map((_, i) => (
            <div key={i} className="border rounded-md p-4 animate-pulse">
              <div className="bg-gray-200 h-5 w-2/3 rounded mb-2"></div>
              <div className="bg-gray-200 h-4 w-full rounded"></div>
            </div>
          ))
        ) : categories && categories.length > 0 ? (
          categories.map((category) => (
            <div key={category.id} className="border rounded-md p-4 hover:border-secondary transition-colors">
              <div className="flex justify-between items-start mb-1">
                <span className="font-medium">{category.name}</span>
                <div className="flex space-x-1">
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-1">
                {category.description || "No description"}
              </p>
              <div className="mt-2">
                <Badge variant="outline" className="bg-secondary/5 border-secondary/20 text-secondary text-xs">
                  {/* This would show spice count in a real implementation */}
                  0 spices
                </Badge>
              </div>
            </div>
          ))
        ) : (
          <div className="border rounded-md p-6 col-span-full text-center text-muted-foreground">
            No categories found. Create your first category to organize your spices.
          </div>
        )}
      </div>
    </div>
  );
}