"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Filter, X } from "lucide-react";
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
  const [searchValue, setSearchValue] = useState(filters.search || "");

  const handleSearch = () => {
    onSearch(searchValue);
  };

  const handleClear = () => {
    setSearchValue("");
    onSearch("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <Input
            placeholder="検索..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="pl-10 pr-10"
          />
          {searchValue && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <Button variant="outline" onClick={handleSearch}>
          <Search className="w-4 h-4 mr-2" />
          検索
        </Button>
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
