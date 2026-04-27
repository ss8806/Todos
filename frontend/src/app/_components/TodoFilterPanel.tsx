"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Filter } from "lucide-react";
import { TodoFilters } from "@/hooks/useTodos";

interface TodoFilterPanelProps {
  filters: TodoFilters;
  showFilters: boolean;
  setShowFilters: (v: boolean) => void;
  onSearch: (value: string) => void;
  onStatusFilter: (value: string | null) => void;
  onPriorityFilter: (value: string | null) => void;
  onSortChange: (value: string | null) => void;
}

export function TodoFilterPanel({
  filters,
  showFilters,
  setShowFilters,
  onSearch,
  onStatusFilter,
  onPriorityFilter,
  onSortChange,
}: TodoFilterPanelProps) {
  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <Input
            placeholder="検索..."
            value={filters.search || ""}
            onChange={(e) => onSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="w-4 h-4" />
        </Button>
      </div>

      {showFilters && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
          <div>
            <label className="text-sm font-medium mb-2 block">ステータス</label>
            <Select onValueChange={onStatusFilter} defaultValue="all">
              <SelectTrigger>
                <SelectValue placeholder="すべて" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                <SelectItem value="pending">未完了</SelectItem>
                <SelectItem value="completed">完了</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">優先度</label>
            <Select onValueChange={onPriorityFilter} defaultValue="all">
              <SelectTrigger>
                <SelectValue placeholder="すべて" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                <SelectItem value="high">高</SelectItem>
                <SelectItem value="medium">中</SelectItem>
                <SelectItem value="low">低</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">並び替え</label>
            <Select onValueChange={onSortChange} defaultValue="created_at-desc">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at-desc">作成日（新しい順）</SelectItem>
                <SelectItem value="created_at-asc">作成日（古い順）</SelectItem>
                <SelectItem value="priority-desc">優先度（高い順）</SelectItem>
                <SelectItem value="priority-asc">優先度（低い順）</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );
}
