"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/lib/supabaseClient";

// Validation schema without user input for email
const FormSchema = z.object({
  title: z.string().min(3, "Title is required"),
  description: z.string().min(5, "Description is required"),
  category: z.string().min(2, "Category is required"),
  // requester_email is still validated, но мы заполняем его сами
  requester_email: z.string().email("Valid email is required"),
});
type FormValues = z.infer<typeof FormSchema>;

export default function TicketForm() {
  const [sending, setSending] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");

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
      category: "",
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

  const onSubmit = async (values: FormValues) => {
    try {
      setSending(true);

      const formData = new FormData();
      formData.append("title", values.title);
      formData.append("description", values.description);
      formData.append("category", values.category);
      formData.append("requester_email", userEmail); // always use logged user email

      const input = document.getElementById(
        "attachments"
      ) as HTMLInputElement | null;
      if (input?.files)
        Array.from(input.files).forEach((f) =>
          formData.append("attachments", f)
        );

      // Optimistic update
      const optimisticId = crypto.randomUUID();
      setCreatedId(optimisticId);

      const res = await fetch("/api/tickets", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        alert("Error: " + (data.error?.message || "Failed to create ticket"));
        setCreatedId(null);
        return;
      }

      setCreatedId(data.ticket_id);
      reset({ title: "", description: "", category: "", requester_email: userEmail });
      if (input) input.value = "";

      // Notify TicketList
      window.dispatchEvent(
        new CustomEvent("ticket:created", { detail: data.ticket_id })
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-4 border rounded-2xl">
      <h2 className="text-xl font-semibold mb-4">Create IT Ticket</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <div>
          <label className="block text-sm mb-1">Title</label>
          <input
            className="w-full border rounded px-3 py-2"
            {...register("title")}
          />
          {errors.title && (
            <p className="text-sm text-red-600">{errors.title.message}</p>
          )}
        </div>
        <div>
          <label className="block text-sm mb-1">Description</label>
          <textarea
            className="w-full border rounded px-3 py-2"
            rows={4}
            {...register("description")}
          />
          {errors.description && (
            <p className="text-sm text-red-600">
              {errors.description.message}
            </p>
          )}
        </div>
        <div>
          <label className="block text-sm mb-1">Category</label>
          <input
            className="w-full border rounded px-3 py-2"
            placeholder="Printers, Microsoft 365, Hardware..."
            {...register("category")}
          />
          {errors.category && (
            <p className="text-sm text-red-600">{errors.category.message}</p>
          )}
        </div>

        {/* Work email shown but disabled */}
        <div>
          <label className="block text-sm mb-1">Your work email</label>
          <input
            className="w-full border rounded px-3 py-2 bg-gray-100"
            type="email"
            value={userEmail}
            disabled
            readOnly
          />
        </div>

        {/* Hidden field to satisfy react-hook-form */}
        <input type="hidden" {...register("requester_email")} />

        <div>
          <label className="block text-sm mb-1">Attachments (optional)</label>
          <input id="attachments" className="w-full" type="file" multiple />
        </div>
        <button
          type="submit"
          disabled={sending}
          className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
        >
          {sending ? "Creating..." : "Create ticket"}
        </button>
      </form>

      {createdId && (
        <p className="mt-3 text-sm">
          Ticket created (temporary id):{" "}
          <span className="font-mono">{createdId}</span>
        </p>
      )}
    </div>
  );
}
