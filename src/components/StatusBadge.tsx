"use client";

type StatusBadgeProps = {
  status: string;
  size?: "sm" | "md" | "lg";
};

export default function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const statusConfig = {
    new: {
      label: "New",
      className: "bg-blue-100 text-blue-800 border-blue-200",
    },
    in_progress: {
      label: "In Progress",
      className: "bg-orange-100 text-orange-800 border-orange-200",
    },
    resolved: {
      label: "Resolved",
      className: "bg-green-100 text-green-800 border-green-200",
    },
    closed: {
      label: "Closed",
      className: "bg-gray-100 text-gray-800 border-gray-200",
    },
  };

  const config = statusConfig[status as keyof typeof statusConfig] || {
    label: status,
    className: "bg-gray-100 text-gray-800 border-gray-200",
  };

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-2.5 py-1",
    lg: "text-base px-3 py-1.5",
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${config.className} ${sizeClasses[size]}`}
    >
      {config.label}
    </span>
  );
}
