import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Note, InsertNote } from "@shared/schema";

type NoteInput = Omit<InsertNote, "userId">;

export function useNotes() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const {
    data: notes,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["/api/notes"],
    select: (data) => data as Note[],
  });

  const createNoteMutation = useMutation({
    mutationFn: async (noteData: NoteInput) => {
      const response = await apiRequest("POST", "/api/notes", noteData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save note. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateNoteMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<NoteInput> }) => {
      const response = await apiRequest("PATCH", `/api/notes/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update note. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/notes/${id}`);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete note. Please try again.",
        variant: "destructive",
      });
    },
  });

  const createNote = (noteData: NoteInput) => createNoteMutation.mutateAsync(noteData);
  const updateNote = (id: string, data: Partial<NoteInput>) => updateNoteMutation.mutateAsync({ id, data });
  const deleteNote = (id: string) => deleteNoteMutation.mutateAsync(id);
  const togglePin = (note: Note) => updateNoteMutation.mutateAsync({ id: note.id, data: { pinned: !note.pinned } });

  return {
    notes,
    isLoading,
    error,
    refetch,
    isCreating: createNoteMutation.isPending,
    isUpdating: updateNoteMutation.isPending,
    isDeleting: deleteNoteMutation.isPending,
    createNote,
    updateNote,
    deleteNote,
    togglePin,
  };
}
