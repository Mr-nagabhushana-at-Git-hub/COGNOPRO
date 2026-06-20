import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import TaskModal from '../modals/task-modal';

const createTask = vi.fn();
vi.mock('@/hooks/use-tasks', () => ({
  useTasks: () => ({ createTask, updateTask: vi.fn() }),
}));
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

describe('TaskModal', () => {
  it('should render task form when open', () => {
    const mockOnClose = vi.fn();
    render(
      <TaskModal 
        isOpen={true} 
        onClose={mockOnClose} 
      />
    );

    expect(screen.getByText(/create new task/i)).toBeTruthy();
  });

  it('should validate required fields before submission', async () => {
    render(
      <TaskModal 
        isOpen={true} 
        onClose={vi.fn()} 
      />
    );

    const submitButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(submitButton);

    // Should not call onSave without required fields
    expect(createTask).not.toHaveBeenCalled();
  });

  it('should call onClose when cancel button is clicked', () => {
    const mockOnClose = vi.fn();

    render(
      <TaskModal 
        isOpen={true} 
        onClose={mockOnClose} 
      />
    );

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });
});
