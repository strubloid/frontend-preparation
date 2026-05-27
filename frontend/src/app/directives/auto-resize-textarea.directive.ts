import { AfterViewInit, Directive, DoCheck, ElementRef, HostListener, inject } from '@angular/core';

@Directive({
  selector: 'textarea[appAutoResizeTextarea]',
})
export class AutoResizeTextareaDirective implements AfterViewInit, DoCheck {
  private readonly elementRef = inject<ElementRef<HTMLTextAreaElement>>(ElementRef);
  private lastValue = '';

  ngAfterViewInit(): void {
    this.resizeToContent();
  }

  ngDoCheck(): void {
    const currentValue = this.textarea.value;

    if (currentValue !== this.lastValue) {
      this.lastValue = currentValue;
      this.resizeToContent();
    }
  }

  @HostListener('input')
  onInput(): void {
    this.lastValue = this.textarea.value;
    this.resizeToContent();
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.resizeToContent();
  }

  private get textarea(): HTMLTextAreaElement {
    return this.elementRef.nativeElement;
  }

  private resizeToContent(): void {
    const textarea = this.textarea;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.max(textarea.scrollHeight, 192)}px`;
  }
}
