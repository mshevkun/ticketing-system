"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/lib/supabaseClient";

// Category options for dropdown (stored as-is in DB)
const CATEGORY_OPTIONS = [
  "Software",
  "Hardware",
  "Printer",
  "Network",
  "Outlook",
  "Other",
] as const;

const FormSchema = z.object({
  title: z.string().min(3, "Title is required"),
  description: z.string().min(5, "Description is required"),
  category: z.enum(CATEGORY_OPTIONS),
  department_program: z.string().min(1, "Department/Program is required"),
  supervisor: z.string().min(1, "Supervisor is required"),
  requester_email: z.string().email("Valid email is required"),
});
type FormValues = z.infer<typeof FormSchema>;

export default function TicketForm() {
  const [sending, setSending] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      title: "",
      description: "",
      category: CATEGORY_OPTIONS[0],
      department_program: "",
      supervisor: "",
      requester_email: "",
    },
  });

  // Get logged-in user email and set it as form value
  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      const email = data.user?.email ?? "";
      setUserEmail(email);
      setValue("requester_email", email); // prefill hidden field
    };
    getUser();
  }, [setValue]);

  const attachmentsRef = useRef<HTMLInputElement | null>(null);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...newFiles]);
    }
  };

  // Remove a file from the selection
  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    // Reset the input to allow re-selecting the same file
    if (attachmentsRef.current) {
      attachmentsRef.current.value = "";
    }
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const onSubmit = async (values: FormValues) => {
    setSending(true);
    try {
      const formData = new FormData();
      formData.append("title", values.title);
      formData.append("description", values.description);
      formData.append("category", values.category);
      formData.append("department_program", values.department_program);
      formData.append("supervisor", values.supervisor);
      formData.append("requester_email", userEmail); // always use logged user email

      // Use selectedFiles state instead of input.files
      selectedFiles.forEach((file) => {
        formData.append("attachments", file);
      });

      // Optimistic update
      const optimisticId = crypto.randomUUID();
      setCreatedId(optimisticId);

      type CreateTicketResponse =
        | { ticket_id: string; uploaded?: number; uploadErrors?: unknown }
        | { error: { message?: string } };
      let res: Response;
      let data: CreateTicketResponse;
      try {
        res = await fetch("/api/tickets", {
          method: "POST",
          body: formData,
        });
        data = await res.json();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        alert("Network error: " + msg);
        setCreatedId(null);
        return;
      }

      if (!res.ok) {
        // data is expected to have an error shape here
        const errMsg =
          (data as { error?: { message?: string } })?.error?.message ||
          "Failed to create ticket";
        alert("Error: " + errMsg);
        setCreatedId(null);
        return;
      }

      // success shape
      const success = data as { ticket_id: string };
      setCreatedId(success.ticket_id);
      reset({
        title: "",
        description: "",
        category: CATEGORY_OPTIONS[0],
        department_program: "",
        supervisor: "",
        requester_email: userEmail,
      });
      setSelectedFiles([]); // Clear selected files
      if (attachmentsRef.current) attachmentsRef.current.value = "";

      // Notify TicketList
      window.dispatchEvent(
        new CustomEvent("ticket:created", { detail: success.ticket_id })
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="w-full bg-white border border-gray-200 rounded-xl p-4 sm:p-6 shadow-sm">
      <div className="mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-1">
          📋 Create IT Ticket
        </h2>
        <p className="text-xs sm:text-sm text-gray-600">
          Submit a new support request to the IT team
        </p>
      </div>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-4 sm:space-y-5"
      >
        <div>
          <label
            htmlFor="title"
            className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2"
          >
            Title *
          </label>
          <input
            id="title"
            className={`w-full border rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
              errors.title
                ? "border-red-300 focus:ring-red-500"
                : "border-gray-300"
            }`}
            placeholder="Brief description of your issue"
            {...register("title")}
          />
          {errors.title && (
            <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
              <span>⚠️</span> {errors.title.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="description"
            className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2"
          >
            Description *
          </label>
          <textarea
            id="description"
            className={`w-full border rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-y ${
              errors.description
                ? "border-red-300 focus:ring-red-500"
                : "border-gray-300"
            }`}
            rows={5}
            placeholder="Provide detailed information about your issue..."
            {...register("description")}
          />
          {errors.description && (
            <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
              <span>⚠️</span> {errors.description.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="category"
            className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2"
          >
            Category *
          </label>
          <select
            id="category"
            className={`w-full border rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors bg-white cursor-pointer ${
              errors.category
                ? "border-red-300 focus:ring-red-500"
                : "border-gray-300"
            }`}
            {...register("category")}
          >
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          {errors.category && (
            <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
              <span>⚠️</span> {errors.category.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="department_program"
            className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2"
          >
            Department / Program *
          </label>
          <input
            id="department_program"
            className={`w-full border rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
              errors.department_program
                ? "border-red-300 focus:ring-red-500"
                : "border-gray-300"
            }`}
            placeholder="e.g., HR, Finance, Program Name"
            {...register("department_program")}
          />
          {errors.department_program && (
            <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
              <span>⚠️</span> {errors.department_program.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="supervisor"
            className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2"
          >
            Supervisor *
          </label>
          <input
            id="supervisor"
            className={`w-full border rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
              errors.supervisor
                ? "border-red-300 focus:ring-red-500"
                : "border-gray-300"
            }`}
            placeholder="Supervisor name"
            {...register("supervisor")}
          />
          {errors.supervisor && (
            <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
              <span>⚠️</span> {errors.supervisor.message}
            </p>
          )}
        </div>

        {/* Work email shown but disabled */}
        <div>
          <label
            htmlFor="work-email"
            className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2"
          >
            Your work email
          </label>
          <input
            id="work-email"
            className="w-full border border-gray-300 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base bg-gray-50 text-gray-600 cursor-not-allowed"
            type="email"
            value={userEmail}
            disabled
            readOnly
          />
          <p className="mt-1.5 text-xs text-gray-500">
            This will be automatically filled from your Microsoft 365 account
          </p>
        </div>

        {/* Hidden field to satisfy react-hook-form */}
        <input type="hidden" {...register("requester_email")} />

        <div>
          <label
            htmlFor="attachments"
            className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2 cursor-pointer"
          >
            📎 Attachments{" "}
            <span className="text-gray-500 font-normal">(optional)</span>
          </label>
          <input
            id="attachments"
            ref={attachmentsRef}
            onChange={handleFileChange}
            className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 file:cursor-pointer cursor-pointer"
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx,.txt"
          />
          <p className="mt-1.5 text-xs text-gray-500">
            You can attach multiple files (screenshots, error messages, etc.)
          </p>

          {/* Selected files preview */}
          {selectedFiles.length > 0 && (
            <div className="mt-3 space-y-2">
              <p className="text-xs font-medium text-gray-700">
                Selected files ({selectedFiles.length}):
              </p>
              <div className="space-y-2">
                {selectedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="text-xl flex-shrink-0">
                        {file.type.startsWith("image/") ? "🖼️" : "📄"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {file.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="ml-2 sm:ml-3 px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0 cursor-pointer"
                      title="Remove file"
                    >
                      ✕ Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={sending}
            className="w-full px-4 sm:px-6 py-2.5 sm:py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm hover:shadow-md cursor-pointer text-sm sm:text-base"
          >
            {sending ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin">⏳</span> Creating ticket...
              </span>
            ) : (
              "✅ Create Ticket"
            )}
          </button>
        </div>
      </form>

      {createdId && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800 flex items-center gap-2">
            <span className="text-lg">✅</span>
            <span>
              <strong>Ticket created successfully!</strong> Your ticket has been
              submitted and will be reviewed by the IT team.
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
