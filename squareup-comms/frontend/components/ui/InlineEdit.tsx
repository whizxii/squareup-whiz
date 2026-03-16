"use client";

import { useState, useRef, useEffect, useCallback, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import { Check, X, Pencil } from "lucide-react";

interface InlineEditProps {
  value: string;
  onSave: (value: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  displayClassName?: string;
  multiline?: boolean;
  maxLength?: number;
  disabled?: boolean;
}

export function InlineEdit({
  value,
  onSave,
  placeholder = "Click to edit...",
  className,
  inputClassName,
  displayClassName,
  multiline = false,
  maxLength,
  disabled = false,
}: InlineEditProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = useCallback(() => {
    const trimmed = editValue.trim();
    if (trimmed !== value) {
      onSave(trimmed);
    }
    setIsEditing(false);
  }, [editValue, value, onSave]);

  const handleCancel = useCallback(() => {
    setEditValue(value);
    setIsEditing(false);
  }, [value]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Enter" && !multiline) {
        e.preventDefault();
        handleSave();
      }
      if (e.key === "Escape") {
        e.preventDefault();
        handleCancel();
      }
    },
    [handleSave, handleCancel, multiline]
  );

  if (disabled) {
    return (
      <span className={cn("text-gray-900 dark:text-gray-100", className, displayClassName)}>
        {value || placeholder}
      </span>
    );
  }

  if (!isEditing) {
    return (
      <button
        onClick={() => setIsEditing(true)}
        className={cn(
          "group inline-flex items-center gap-1.5 rounded-md px-1 -mx-1 text-left transition-colors hover:bg-gray-100 dark:hover:bg-gray-800",
          className,
          displayClassName
        )}
      >
        <span className={cn(!value && "text-gray-400 dark:text-gray-500")}>
          {value || placeholder}
        </span>
        <Pencil className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
      </button>
    );
  }

  const inputProps = {
    ref: inputRef as never,
    value: editValue,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setEditValue(e.target.value),
    onKeyDown: handleKeyDown,
    onBlur: handleSave,
    maxLength,
    placeholder,
    className: cn(
      "rounded-md border border-blue-500 bg-white px-2 py-1 text-sm outline-none ring-2 ring-blue-500/20 dark:bg-gray-900 dark:border-blue-400",
      inputClassName
    ),
  };

  return (
    <div className={cn("inline-flex items-center gap-1", className)}>
      {multiline ? (
        <textarea {...inputProps} rows={3} />
      ) : (
        <input type="text" {...inputProps} />
      )}
      <div className="flex flex-col gap-0.5">
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleSave}
          className="rounded p-0.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30"
        >
          <Check className="h-3.5 w-3.5" />
        </button>
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleCancel}
          className="rounded p-0.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
