import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { NotebookPen, Plus, Trash2, Pin, PinOff, Loader2, StickyNote, X } from "lucide-react";
import type { Note } from "@shared/schema";
import { useNotes } from "@/hooks/use-notes";

const COLORS: { id: string; label: string; dot: string; ring: string; card: string }[] = [
  { id: "default", label: "Slate", dot: "bg-slate-400", ring: "ring-slate-400", card: "border-white/10" },
  { id: "indigo", label: "Indigo", dot: "bg-indigo-400", ring: "ring-indigo-400", card: "border-indigo-500/30" },
  { id: "emerald", label: "Emerald", dot: "bg-emerald-400", ring: "ring-emerald-400", card: "border-emerald-500/30" },
  { id: "amber", label: "Amber", dot: "bg-amber-400", ring: "ring-amber-400", card: "border-amber-500/30" },
  { id: "rose", label: "Rose", dot: "bg-rose-400", ring: "ring-rose-400", card: "border-rose-500/30" },
  { id: "purple", label: "Purple", dot: "bg-purple-400", ring: "ring-purple-400", card: "border-purple-500/30" },
];

const cardTint: Record<string, string> = {
  default: "bg-white/[0.03] border-white/10",
  indigo: "bg-indigo-500/[0.06] border-indigo-500/25",
  emerald: "bg-emerald-500/[0.06] border-emerald-500/25",
  amber: "bg-amber-500/[0.06] border-amber-500/25",
  rose: "bg-rose-500/[0.06] border-rose-500/25",
  purple: "bg-purple-500/[0.06] border-purple-500/25",
};

function formatDate(d: Date | string | null): string {
  if (!d) return "";
  const date = new Date(d);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function Notes() {
  const { notes, isLoading, createNote, updateNote, deleteNote, togglePin, isCreating } = useNotes();
  const [composerOpen, setComposerOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [color, setColor] = useState("default");
  const [editingId, setEditingId] = useState<string | null>(null);

  const resetComposer = () => {
    setTitle("");
    setContent("");
    setColor("default");
    setEditingId(null);
    setComposerOpen(false);
  };

  const handleSave = async () => {
    if (!title.trim() && !content.trim()) return;
    if (editingId) {
      await updateNote(editingId, { title: title.trim() || "Untitled", content: content.trim(), color });
    } else {
      await createNote({ title: title.trim() || "Untitled", content: content.trim(), color });
    }
    resetComposer();
  };

  const startEdit = (note: Note) => {
    setEditingId(note.id);
    setTitle(note.title);
    setContent(note.content);
    setColor(note.color || "default");
    setComposerOpen(true);
  };

  return (
    <div className="min-h-[calc(100vh-64px)] p-6 lg:p-10 bg-background">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-8"
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl gradient-bg flex items-center justify-center">
            <NotebookPen className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground tracking-tight">Notes</h1>
            <p className="text-sm text-muted-foreground">Capture quick thoughts and ideas</p>
          </div>
        </div>
        <Button onClick={() => (composerOpen ? resetComposer() : setComposerOpen(true))} className="gradient-bg text-white" data-testid="button-new-note">
          {composerOpen ? <X className="h-4 w-4 mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
          {composerOpen ? "Close" : "New Note"}
        </Button>
      </motion.div>

      {/* Composer */}
      <AnimatePresence>
        {composerOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-8"
          >
            <Card className={cn("glass-card", cardTint[color])}>
              <CardContent className="p-5 space-y-3">
                <Input
                  placeholder="Title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="bg-transparent border-white/10 text-lg font-semibold"
                  data-testid="input-note-title"
                />
                <Textarea
                  placeholder="Write a quick note..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={5}
                  className="bg-transparent border-white/10 resize-none"
                  data-testid="input-note-content"
                />
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-2">
                    {COLORS.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setColor(c.id)}
                        className={cn(
                          "w-6 h-6 rounded-full transition-transform",
                          c.dot,
                          color === c.id ? `ring-2 ring-offset-2 ring-offset-background ${c.ring} scale-110` : "opacity-70 hover:opacity-100"
                        )}
                        aria-label={c.label}
                        data-testid={`color-${c.id}`}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" onClick={resetComposer} data-testid="button-cancel-note">Cancel</Button>
                    <Button onClick={handleSave} disabled={isCreating} className="gradient-bg text-white" data-testid="button-save-note">
                      {isCreating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                      {editingId ? "Update" : "Save"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notes grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-24 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading notes...
        </div>
      ) : !notes?.length ? (
        <div className="text-center py-24">
          <StickyNote className="h-14 w-14 text-muted-foreground/40 mx-auto mb-4" />
          <p className="text-muted-foreground font-medium">No notes yet</p>
          <p className="text-sm text-muted-foreground/70 mt-1">Click "New Note" to capture your first thought.</p>
        </div>
      ) : (
        <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 [column-fill:_balance]">
          <AnimatePresence>
            {notes.map((note) => (
              <motion.div
                key={note.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="mb-4 break-inside-avoid"
              >
                <Card className={cn("glass-card group cursor-pointer transition-all hover:shadow-lg", cardTint[note.color || "default"])}>
                  <CardContent className="p-4" onClick={() => startEdit(note)}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-semibold text-foreground line-clamp-2">{note.title}</h3>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => { e.stopPropagation(); togglePin(note); }}
                          className="p-1 rounded-md hover:bg-white/10 text-muted-foreground hover:text-foreground"
                          data-testid={`pin-note-${note.id}`}
                        >
                          {note.pinned ? <Pin className="h-3.5 w-3.5 text-amber-400 fill-amber-400" /> : <PinOff className="h-3.5 w-3.5" />}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }}
                          className="p-1 rounded-md hover:bg-rose-500/20 text-muted-foreground hover:text-rose-400"
                          data-testid={`delete-note-${note.id}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    {note.pinned && (
                      <Pin className="h-3 w-3 text-amber-400 fill-amber-400 mb-1 group-hover:hidden" />
                    )}
                    {note.content && (
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-[12]">{note.content}</p>
                    )}
                    <p className="text-[11px] text-muted-foreground/50 mt-3">{formatDate(note.updatedAt)}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
