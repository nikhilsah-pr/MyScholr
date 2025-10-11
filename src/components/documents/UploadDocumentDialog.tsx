import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Upload, Loader2 } from "lucide-react";

interface Course {
  id: string;
  course_code: string;
  course_name: string;
}

interface UploadDocumentDialogProps {
  courses: Course[];
  onUploadSuccess: () => void;
}

export default function UploadDocumentDialog({
  courses,
  onUploadSuccess,
}: UploadDocumentDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    courseId: "",
    tags: "",
  });

  const validateTags = (tagsString: string): { valid: boolean; error?: string } => {
    if (!tagsString.trim()) return { valid: true };
    
    if (tagsString.length > 500) {
      return { valid: false, error: "Tags string is too long (max 500 characters)" };
    }

    const tagArray = tagsString.split(",").map((tag) => tag.trim()).filter(Boolean);
    
    if (tagArray.length > 20) {
      return { valid: false, error: "Maximum 20 tags allowed" };
    }

    const invalidTag = tagArray.find((tag) => tag.length > 50);
    if (invalidTag) {
      return { valid: false, error: "Each tag must be 50 characters or less" };
    }

    const invalidChars = tagArray.find((tag) => !/^[a-zA-Z0-9\s\-_]+$/.test(tag));
    if (invalidChars) {
      return { valid: false, error: "Tags can only contain letters, numbers, spaces, hyphens, and underscores" };
    }

    return { valid: true };
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Check file size (50MB limit)
      if (selectedFile.size > 52428800) {
        toast.error("File size must be less than 50MB");
        return;
      }
      setFile(selectedFile);
      // Auto-fill title if empty
      if (!formData.title) {
        setFormData({ ...formData, title: selectedFile.name });
      }
    }
  };

  const handleUpload = async () => {
    if (!file || !user) return;

    if (!formData.title.trim()) {
      toast.error("Please enter a title");
      return;
    }

    // Validate title length
    if (formData.title.trim().length > 200) {
      toast.error("Title must be less than 200 characters");
      return;
    }

    // Validate description length
    if (formData.description && formData.description.trim().length > 1000) {
      toast.error("Description must be less than 1000 characters");
      return;
    }

    // Validate category length
    if (formData.category && formData.category.trim().length > 50) {
      toast.error("Category must be less than 50 characters");
      return;
    }

    // Validate tags
    const tagsValidation = validateTags(formData.tags);
    if (!tagsValidation.valid) {
      toast.error(tagsValidation.error!);
      return;
    }

    try {
      setUploading(true);

      // Upload file to storage
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Create database record with file path (not public URL)
      const tags = formData.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);

      const { error: dbError } = await supabase.from("documents").insert({
        user_id: user.id,
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        file_url: fileName, // Store path instead of public URL for better security
        file_type: file.type,
        file_size: file.size,
        category: formData.category.trim() || null,
        course_id: formData.courseId || null,
        tags: tags.length > 0 ? tags : null,
      });

      if (dbError) throw dbError;

      toast.success("Document uploaded successfully");
      setOpen(false);
      resetForm();
      onUploadSuccess();
    } catch (error: any) {
      console.error("Error uploading document:", error);
      toast.error("Failed to upload document: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setFormData({
      title: "",
      description: "",
      category: "",
      courseId: "",
      tags: "",
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Upload className="mr-2 h-4 w-4" />
          Upload Document
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="file">File *</Label>
            <Input
              id="file"
              type="file"
              onChange={handleFileChange}
              disabled={uploading}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.txt"
            />
            {file && (
              <p className="text-sm text-muted-foreground">
                {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              disabled={uploading}
              placeholder="Document title"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              disabled={uploading}
              placeholder="Optional description"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Input
              id="category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              disabled={uploading}
              placeholder="e.g., Syllabus, Assignment, Notes"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="course">Course (Optional)</Label>
            <Select
              value={formData.courseId}
              onValueChange={(value) => setFormData({ ...formData, courseId: value })}
              disabled={uploading}
            >
              <SelectTrigger id="course">
                <SelectValue placeholder="Select course" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {courses.map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.course_code} - {course.course_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              disabled={uploading}
              placeholder="Comma-separated tags"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={uploading}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={!file || uploading}>
            {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Upload
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
