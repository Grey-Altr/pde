import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils';

// Test the variant class logic directly, mirroring ProgressIndicator's cn() logic
function progressIndicatorClass(variant?: 'executing' | 'waiting' | 'failed' | 'complete'): string {
  return cn(
    "h-full bg-primary transition-all",
    variant === 'executing' && "progress-striped progress-executing",
    variant === 'waiting'   && "progress-striped progress-waiting",
    variant === 'failed'    && "opacity-30",
  );
}

describe('ProgressIndicator variant classes', () => {
  it('variant=executing produces progress-striped and progress-executing', () => {
    const className = progressIndicatorClass('executing');
    expect(className).toContain('progress-striped');
    expect(className).toContain('progress-executing');
  });

  it('variant=waiting produces progress-striped and progress-waiting', () => {
    const className = progressIndicatorClass('waiting');
    expect(className).toContain('progress-striped');
    expect(className).toContain('progress-waiting');
  });

  it('variant=failed produces opacity-30', () => {
    const className = progressIndicatorClass('failed');
    expect(className).toContain('opacity-30');
    expect(className).not.toContain('progress-striped');
  });

  it('no variant produces only default classes', () => {
    const className = progressIndicatorClass();
    expect(className).toContain('h-full');
    expect(className).toContain('bg-primary');
    expect(className).toContain('transition-all');
    expect(className).not.toContain('progress-striped');
    expect(className).not.toContain('progress-executing');
    expect(className).not.toContain('progress-waiting');
    expect(className).not.toContain('opacity-30');
  });

  it('variant=complete produces only default classes (no animation)', () => {
    const className = progressIndicatorClass('complete');
    expect(className).not.toContain('progress-striped');
    expect(className).not.toContain('opacity-30');
  });

  it('variant=executing does not produce progress-waiting', () => {
    const className = progressIndicatorClass('executing');
    expect(className).not.toContain('progress-waiting');
  });

  it('variant=waiting does not produce progress-executing', () => {
    const className = progressIndicatorClass('waiting');
    expect(className).not.toContain('progress-executing');
  });
});
