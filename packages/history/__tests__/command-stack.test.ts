import { describe, it, expect, vi } from 'vitest';
import { CommandStack } from '../src/command-stack.js';
import { createCommand } from '../src/command.js';

function makeCommand(desc: string, execFn = vi.fn(), undoFn = vi.fn()) {
  return createCommand({
    execute: execFn,
    undo: undoFn,
    description: desc,
  });
}

describe('CommandStack', () => {
  it('should start empty', () => {
    const stack = new CommandStack();
    expect(stack.canUndo).toBe(false);
    expect(stack.canRedo).toBe(false);
    expect(stack.undoCount).toBe(0);
    expect(stack.redoCount).toBe(0);
  });

  it('should push commands onto the undo stack', () => {
    const stack = new CommandStack();
    stack.push(makeCommand('cmd1'));
    stack.push(makeCommand('cmd2'));
    expect(stack.undoCount).toBe(2);
    expect(stack.canUndo).toBe(true);
  });

  it('should undo the most recent command', async () => {
    const undoFn = vi.fn();
    const stack = new CommandStack();
    stack.push(makeCommand('cmd1', vi.fn(), undoFn));

    const result = await stack.undo();
    expect(result).not.toBeNull();
    expect(result?.description).toBe('cmd1');
    expect(undoFn).toHaveBeenCalledOnce();
    expect(stack.canUndo).toBe(false);
    expect(stack.canRedo).toBe(true);
  });

  it('should redo the most recently undone command', async () => {
    const execFn = vi.fn();
    const stack = new CommandStack();
    stack.push(makeCommand('cmd1', execFn));

    await stack.undo();
    const result = await stack.redo();
    expect(result).not.toBeNull();
    expect(result?.description).toBe('cmd1');
    expect(execFn).toHaveBeenCalledOnce();
    expect(stack.canUndo).toBe(true);
    expect(stack.canRedo).toBe(false);
  });

  it('should return null when undoing empty stack', async () => {
    const stack = new CommandStack();
    const result = await stack.undo();
    expect(result).toBeNull();
  });

  it('should return null when redoing empty stack', async () => {
    const stack = new CommandStack();
    const result = await stack.redo();
    expect(result).toBeNull();
  });

  it('should clear redo stack when new command is pushed', async () => {
    const stack = new CommandStack();
    stack.push(makeCommand('cmd1'));
    stack.push(makeCommand('cmd2'));

    await stack.undo(); // undo cmd2 → redo stack has cmd2
    expect(stack.canRedo).toBe(true);

    stack.push(makeCommand('cmd3')); // pushing clears redo
    expect(stack.canRedo).toBe(false);
    expect(stack.undoCount).toBe(2); // cmd1, cmd3
  });

  it('should enforce max depth', () => {
    const stack = new CommandStack({ maxDepth: 3 });
    stack.push(makeCommand('cmd1'));
    stack.push(makeCommand('cmd2'));
    stack.push(makeCommand('cmd3'));
    stack.push(makeCommand('cmd4'));

    expect(stack.undoCount).toBe(3);
    const history = stack.getUndoHistory();
    expect(history).toEqual(['cmd4', 'cmd3', 'cmd2']);
  });

  it('should provide undo/redo history descriptions', async () => {
    const stack = new CommandStack();
    stack.push(makeCommand('first'));
    stack.push(makeCommand('second'));
    stack.push(makeCommand('third'));

    expect(stack.getUndoHistory()).toEqual(['third', 'second', 'first']);

    await stack.undo();
    expect(stack.getRedoHistory()).toEqual(['third']);
    expect(stack.getUndoHistory()).toEqual(['second', 'first']);
  });

  it('should clear both stacks', async () => {
    const stack = new CommandStack();
    stack.push(makeCommand('cmd1'));
    stack.push(makeCommand('cmd2'));
    await stack.undo();

    stack.clear();
    expect(stack.canUndo).toBe(false);
    expect(stack.canRedo).toBe(false);
    expect(stack.undoCount).toBe(0);
    expect(stack.redoCount).toBe(0);
  });

  it('should handle multiple undo/redo cycles', async () => {
    const undo1 = vi.fn();
    const undo2 = vi.fn();
    const exec1 = vi.fn();
    const exec2 = vi.fn();
    const stack = new CommandStack();

    stack.push(makeCommand('cmd1', exec1, undo1));
    stack.push(makeCommand('cmd2', exec2, undo2));

    await stack.undo(); // undo cmd2
    await stack.undo(); // undo cmd1
    expect(undo2).toHaveBeenCalledOnce();
    expect(undo1).toHaveBeenCalledOnce();

    await stack.redo(); // redo cmd1
    await stack.redo(); // redo cmd2
    expect(exec1).toHaveBeenCalledOnce();
    expect(exec2).toHaveBeenCalledOnce();
  });
});
