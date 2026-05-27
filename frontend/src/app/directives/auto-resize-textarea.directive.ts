import { AfterViewInit, Directive, DoCheck, ElementRef, HostListener, inject } from '@angular/core';

@Directive({
  selector: 'textarea[appAutoResizeTextarea]',
})
export class AutoResizeTextareaDirective implements AfterViewInit, DoCheck {
  private readonly elementRef = inject<ElementRef<HTMLTextAreaElement>>(ElementRef);
  private lastValue = '';
  private readonly minimumHeight = 192;

  ngAfterViewInit(): void {
    this.syncGroupHeights();
  }

  ngDoCheck(): void {
    const currentValue = this.textarea.value;

    if (currentValue !== this.lastValue) {
      this.lastValue = currentValue;
      this.syncGroupHeights();
    }
  }

  @HostListener('input')
  onInput(): void {
    this.lastValue = this.textarea.value;
    this.syncGroupHeights();
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.syncGroupHeights();
  }

  private get textarea(): HTMLTextAreaElement {
    return this.elementRef.nativeElement;
  }

  private syncGroupHeights(): void {
    const textareas = this.getSynchronizedTextareas();

    for (const textarea of textareas) {
      textarea.style.height = 'auto';
    }

    const targetHeight = Math.max(
      this.minimumHeight,
      ...textareas.map((textarea) => textarea.scrollHeight),
    );

    for (const textarea of textareas) {
      textarea.style.height = `${targetHeight}px`;
    }
  }

  private getSynchronizedTextareas(): HTMLTextAreaElement[] {
    const group = this.textarea.closest('.field-grid-double');

    if (!group) {
      return [this.textarea];
    }

    const textareas = Array.from(group.querySelectorAll('textarea[appAutoResizeTextarea]')).filter(
      (element): element is HTMLTextAreaElement => element instanceof HTMLTextAreaElement,
    );
    return textareas.length > 0 ? textareas : [this.textarea];
  }
}
