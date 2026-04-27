"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Todo } from "@/hooks/useTodos";
import { Loader2 } from "lucide-react";

interface TodoEditDialogProps {
  todo: Todo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: {
    title?: string;
    is_completed?: boolean;
    priority?: "high" | "medium" | "low";
    due_date?: string;
    tags?: string;
  }) => void;
  isPending: boolean;
}

export function TodoEditDialog({
  todo,
  open,
  onOpenChange,
  onSave,
  isPending,
}: TodoEditDialogProps) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<string>("");
  const [dueDate, setDueDate] = useState("");
  const [tags, setTags] = useState("");

  useEffect(() => {
    if (todo) {
      const id = requestAnimationFrame(() => {
        setTitle(todo.title);
        setPriority(todo.priority || "");
        setDueDate(todo.due_date ? todo.due_date.split("T")[0] : "");
        setTags(todo.tags || "");
      });
      return () => cancelAnimationFrame(id);
    }
  }, [todo]);

  const handleSave = () => {
    onSave({
      title: title.trim() || undefined,
      priority: priority ? (priority as "high" | "medium" | "low") : undefined,
      due_date: dueDate || undefined,
      tags: tags.trim() || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>タスクを編集</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="edit-title">タイトル</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="タスクのタイトル"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-priority">優先度</Label>
            <Select
              value={priority}
              onValueChange={(v) => setPriority(v || "")}
            >
              <SelectTrigger id="edit-priority">
                <SelectValue placeholder="優先度を選択" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high">高</SelectItem>
                <SelectItem value="medium">中</SelectItem>
                <SelectItem value="low">低</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-due-date">期限</Label>
            <Input
              id="edit-due-date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-tags">タグ</Label>
            <Input
              id="edit-tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="カンマ区切りで入力"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            キャンセル
          </Button>
          <Button onClick={handleSave} disabled={isPending || !title.trim()}>
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : null}
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
